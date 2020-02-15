---
title: "Adventures in C# Optimization"
date: 2020-02-14
categories:
  - programming
  - optimization
layout: post
path: blog/adventures-in-c-sharp-optimization-2020-02-15
---
As part of a new [game save file API](https://github.com/SnowflakePowered/snowflake/pull/571) I've been working on, I needed a library to do binary diffs in C#. Usually I could just grab a library off 
of NuGet, but I was surprised to find that only [deltaq](https://github.com/jzebedee/deltaq), a BSDIFF implementation, was available.

BSDIFF is great for executables, but for my type of data, wasn't ideal. Save files for early game systems usually change very little, and I wanted to diff each save file against a base, like Git, but for game saves). At least from my experience, the traditional algorithm for ROMs and such was VCDIFF (using xdelta3), and I wanted to use that algorithm. Thankfully, someone did write up a port of [open-vcdiff](https://github.com/google/open-vcdiff) to C#: [Metric/VCDiff](https://github.com/Metric/VCDiff). If you're reading this, thanks so much Metric!

That's it. End of story. Or it would be, if VCDiff as it came in the box wasn't slow as molasses. This isn't a proper benchmark of any sort, but here's how long it takes for the original VCDiff library to encode a diff for a 2MB file.

![image](https://user-images.githubusercontent.com/1000503/74580271-458cac80-4f70-11ea-9930-094541cb47c2.png)

8 seconds is an insane amount of time, especially when tools like xdelta can do it in a fraction of that time. Without any other options, I sat down and took a look at how to cut this down to hopefully just as fast as a C or C++ implementation of VCDIFF.

## Tackling the obvious stuff

You can see from the above trace that most of the time is being taken up  by the `EncodeCopyForBestMatch` function. Using dotTrace's hotspot functionality, it seems a lot of time is taken up by `ByteStreamReader`, particularly with the `ReadByte` method and the `Position` setter.

![byte stream reader](https://user-images.githubusercontent.com/1000503/74580307-a2886280-4f70-11ea-99f9-1cdf8193e1ad.png)

What could be taking up so much time? Here's what `ByteStreamReader.set_Position` looks like

```csharp
public long Position {
    get { ... }
    set 
    {
        if (readAll)
        {
             if (value >= 0)
             offset = value;
        }
        if (buffer.CanRead && value >= 0) buffer.Position = value;
    }
}
```

 `ByteStreamReader` keeps an internal `List<byte>` to cache what it's already read from an underlying `Stream` (`buffer`) that in this case, is a `FileStream.` But it also has another method, `BufferAll`, that copies the stream in chunks to the internal cache, which is *always called before any access*. There is no point in ever setting the position of the underlying `FileStream`, at all. Simplying adding an `else` in the correct place saves us nearly 6 seconds of time.

 ![Six seconds](https://user-images.githubusercontent.com/1000503/74580562-7f12e700-4f73-11ea-93d2-7e8e9ac26dca.png)

The next obvious thing to tackle here is `ReadByte`. Thus begins my deep dive into `Span<T>` and `Memory<T>`.

## `Span<T>` and `Memory<T>`

The first thing I did was replace anything that used `byte[]` array copies with `Memory<T>`, and anything that used multiple byte arrays with a single byte array, and `Memory<T>` "windows" across the single array.

![image](https://user-images.githubusercontent.com/1000503/74580781-d1550780-4f75-11ea-9191-303e38586f00.png)

That didn't help much, but at least there are no more byte copies. The input streams are now allocated pretty much at most once into memory, and handles in the form of `Memory<T>` are passed around instead of copying into a new array.

However, It looks like most of the time is being spent in bounds checking for `ByteStreamReader`, and fixing a span using `Memory<byte>.Span` in `ByteBuffer`. So, at some point I figured that I could just use `ByteBuffer` in place of `ByteStreamReader` (since `ByteStreamReader` already buffers its entire stream into memory), and just focus on optimizing `ByteBuffer`.

`Memory<T>` has the `Pin()` API that allows us to get a raw pointer address, and fix it safely without the GC moving it around, for the lifetime of the object. Surely, dereferencing a raw pointer has to be the fastest way, and would get rid of any overhead from `Memory<T>.Span`.

```csharp
 public byte ReadByte()
{
    if (offset >= length) throw new Exception("Trying to read past end of buffer");
    unsafe
    {
        return &bytePtr[offset++];
    }
}
```

![image](https://user-images.githubusercontent.com/1000503/74580877-8091de80-4f76-11ea-9d05-2a3f1baa1af5.png)

A small improvement! But it's obvious now that to get better speeds, I need to reduce the amount of times `ReadByte` is called.

## Vectorization Take One: `System.Numerics.Vector<T>`

The `MatchingBytesToTheRight` function was an obvious place to start looking at.

```csharp
while (bytesFound < maxBytes)
{
    if (sindex >= srcLength || tindex >= trgLength) break;
    if (!sourceData.CanRead) break;
    byte lb = sourceData.ReadByte();
    if (!target.CanRead) break;
    byte rb = target.ReadByte();
    if (lb != rb) break;
    ++tindex;
    ++sindex;
    ++bytesFound;
}
```


C# does not have support for auto-vectorization, but fairly recently (as of .NET Core 3.1) exposed SIMD intrinsics in the form of the `System.Runtime.Intrinsics` API, as well as the `System.Numerics.Vector<T>` API which is a little bit more widely supported (`netstandard2.1`, instead of requiring `netcoreapp3.1`) It was also a bit more easier to use, so I started out with that.

The loop above is trivially vectorizable using `System.Numerics.Vector<T>`:

```csharp
for (; bytesFound <= maxBytes - vectorSize; bytesFound += vectorSize, 
        tindex += vectorSize, sindex += vectorSize)
{
    var lb = source.ReadBytes(vectorSize).Span;
    var rb = target.ReadBytes(vectorSize).Span;
    if (lb.Length < vectorSize || rb.Length < vectorSize)
    {
        source.Position -= vectorSize;
        target.Position -= vectorSize;
        break;
    }
    var lv = new Vector<byte>(lb);
    var rv = new Vector<byte>(rb);
    if (Vector.EqualsAll(lv, rv)) continue;
    source.Position -= vectorSize;
    target.Position -= vectorSize;
    break;
}
```
![image](https://user-images.githubusercontent.com/1000503/74580997-23972800-4f78-11ea-95de-5575116eb60f.png)

This provided huge time savings, cutting down the 4s time to about 1 second. Vectorizing `MatchingBytesToTheRight` like this wouldn't have been possible without first using `Span<byte>`, since `PeekBytes` was previously implemented as a byte array copy! The time to load each slice into the vector would have been dominated by the time to copy the array into another heap-allocated array. Armed with newfound confidence, I set out to try and optimize stuff out even further. 

There were basically three main steps that were taking a substantial amount of time. 

* Calculating the Adler32 checksum of the output diff
* The rolling hash used to hash individual blocks of data (a Rabin-Karp hash)
* Searching for the individual blocks (chunks) of data that are similar. We did this already with `Vector<T>`, but I'll revisit this later in the article as well.

## Vectorizing Adler32 and `System.Runtime.Intrinsics`

The Adler32 hashing function seemed like an easy target for vectorization. I have never touched SIMD programming before, but since Adler32 is a well-known algorithm with plenty of implementations, I figured I could grab one off the shelf and rewrite it in C#. 

And as luck would have it, Chromium uses an [SSSE3 optimized version of Adler32](https://chromium.googlesource.com/chromium/src/third_party/zlib/+/master/adler32_simd.c). Converting this to C# was a matter of [looking up which intrinsic corresponds to which method call in `System.Runtime.Intrinsics`](https://github.com/SnowflakePowered/vcdiff/blob/master/src/VCDiff/Shared/Adler32.cs#L82). Unfortunately, it used SSE specific instructions, that `Vector<T>` doesn't support. This means that only `netcoreapp3.1` consumers would be able to take advantage of the vectorized Adler32 routine. As it turns out, this becomes not too much of a problem as you'll see later on.

The SSSE3 version gave a nice speed-up whenever the Adler32 checksum was involved, as compared to the scalar implementation. It was also trivial to convert it to AVX2 (after some [furious Googling on how to get the horizontal sum of a 256-bit vector](https://stackoverflow.com/questions/60108658/fastest-method-to-calculate-sum-of-all-packed-32-bit-integers-using-avx512-or-av)).

![image](https://user-images.githubusercontent.com/1000503/74581179-8093dd80-4f7a-11ea-9114-861d07ccd3f5.png)

Along the way, I had added support for the xdelta3 Adler32 checksum format, which is why the function name changed to `ComputeGoogleAdler32` Computing the hash went from 39ms, to 9ms, which is a pretty good amount of savings. I don't have too much else to say here, since this was essentially copy and paste. To be completely honest, I still don't understand exactly *why* the implementation works, but I verified it with the scalar path.

## Vectorizing the Rolling Hash Algorithm

The next target I had set my sights on was the `AddAllBlocks` method, which took 88ms, which you can see about two screenshots ago. The original author here took the algorithm straight from the C++ version, and using direct pointer access seemed to speed it up a little bit.

```csharp
private const int kMult = 257;
private const int kBase = (1 << 23);

public ulong Hash(ReadOnlyMemory<byte> bytes)
{
    unsafe
    {
        fixed (byte* span = bytes.Span)
        {
            if (bytes.Length == 0) return 1;
            if (bytes.Length == 1) return span[0] * kMult;
            ulong h = (span[0] * (ulong)kMult) + span[1];
            for (int i = 2; i < bytes.Length; i++)
            {
                h = (h * kMult + span[i]) & (kBase - 1);
            }
            return h;
        }
    }
}
```
![image](https://user-images.githubusercontent.com/1000503/74581278-8b02a700-4f7b-11ea-8b39-44a6d5a1cbe8.png)

57ms, as compared to 88ms, is good, but we can do better. To vectorize this, we'll need to do some math. This rolling hash algorithm is an implementation of the hash used in the Rabin-Karp string search algorithm. (I didn't know this at first, and solved the recurrence manually for `h`), which can be represented as the following sum:

![image](https://user-images.githubusercontent.com/1000503/74581375-c94c9600-4f7c-11ea-8893-67360748926a.png)

Where `c` is `kMult`, and `S_i` are the elements of the array. One important observation is that `i` never exceeds the block size used to calculate the diff. By default its 16, but I've been testing with a block size of 32, which I will use here. If I pre-calculate the powers of `kMult`, I can load them up in a SIMD vector, and then just do a vertical multiply on the elements of `span`. All the math is done mod 257, which can be done just using a binary AND operation.

First, I wrote a scalar implementation of this algorithm using precomputed powers of `kMult`

```csharp
// Compute the powers of kMult in O(n)
uint c = 1;
for (int i = 0; i < 32; i++)
{
    kMultFactors[i] = (int)c;
    c = (c * kMult) & (kBase - 1);
}

// ...

// Compute the hash. 
// This is equivalent to the previous implementation 

int len = span.Length;

for (int i = 0; i < len; i++)
{
    int index = len - i - 1;
    ulong c = (uint)kMultFactors[index];
    h += (c * span[i]) & (kBase - 1);
}
```

Then, an SIMD implementation became much more obvious. I'll show the AVX2 implementation here, as it's shorter.

```csharp
ulong h = 0;
Vector256<int> v_ps = Vector256<int>.Zero;
Vector256<int> v_kbase = Vector256.Create(kBase - 1);
Vector256<int> v_shuf = Vector256.Create(7, 6, 5, 4, 3, 2, 1, 0);
fixed (byte* buf = span)
{
    for (int i = 0, j = len - i - 1; len - i >= 8; 
    i += 8, j = len - i - 1)
    {

        Vector256<int> c_v = 
            Avx2.LoadDquVector256(&kMultFactorsPtr[j - 7]);
        // Need to reverse the order of the constant factors
        c_v = Avx2.PermuteVar8x32(c_v, v_shuf);

        // We're multiplying ints, but LoadVector128 loads in bytes
        // so we need to properly unpack the epu8 bytes into epi32 ints
        Vector128<byte> q_v = Sse2.LoadVector128(buf + i);
        Vector256<int> s_v = Avx2.ConvertToVector256Int32(q_v);
        
        // Multiply each byte with the corresponding
        // power of kMult, binary AND with kBase - 1 to do the modulo
        // then collect the results in v_ps
        v_ps = 
            Avx2.Add(v_ps,
                Avx2.And(Avx2.MultiplyLow(c_v, s_v), v_kbase));
    }
}

// Take the horizontal sum of v_ps, and collect in h
Vector128<int> v128_ps = Sse2.Add(Avx2.ExtractVector128(v_ps, 0), 
    Avx2.ExtractVector128(v_ps, 1));
v128_ps = Sse2.Add(v128_ps, Sse2.Shuffle(v128_ps, S23O1));
v128_ps = Sse2.Add(v128_ps, Sse2.Shuffle(v128_ps, S1O32));

h += Sse2.ConvertToUInt32(v128_ps.AsUInt32());

return h & (kBase - 1);
```

[After these optimizations](https://github.com/SnowflakePowered/vcdiff/commit/59414127ed15c90be6d4ca6619792851f85eb6f2), the rolling hash operation doesn't even show up on the trace.

![gone](https://user-images.githubusercontent.com/1000503/74581486-e897f300-4f7d-11ea-84bc-5998d03e73e4.png)

Using a smaller block size (which at least doubles the encoding work needed) shows a clearer picture of just how much faster the vectorized version is.

![four times the work](https://user-images.githubusercontent.com/1000503/74581499-0402fe00-4f7e-11ea-8d48-a2520bdc0ad7.png)

Remember, this is double or more the amount of work needed to be done compared to when I tested the previous implementation. That's at least twice as fast as the naive implementation. 

## Setting my sights back onto `MatchingBytes`

Despite these savings, my times were still pretty bad compared to the ~100ms times I benchmarked for the native C++ implementations of xdelta3 and open-vcdiff.

![image](https://user-images.githubusercontent.com/1000503/74581740-d66b8400-4f80-11ea-86c6-08f7772d7b22.png)


335ms encoding time is still four times slower than native code. I know I can't expect too much out of a JITted language with a GC, but I still felt like it had more to give.

The obvious problem here was that I was being bottlenecked by `Span`. Unfortunately, `Vector<T>` only works with `Span<T>`, but in order to load a up vector without the overhead of `Span`, I needed to be able to load from a memory address using intrinsics like `__m128i _mm_loadu_si128`, (provided in C# as [Sse2.LoadVector128](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.intrinsics.x86.sse2.loadvector128?view=netcore-3.1) in this case). Which means, raw pointer access once again. 

With the hashing example, I used `fixed` to get a pointer to a `Span<T>`. Here, I want to completely forgo initializing the `Span` in the first place. Remember when I was optimizing `ReadByte`, and used `Pin()` to get a pointer to the underlying byte array of the `ByteBuffer`? Since all the `ByteBuffers` are created and destroyed internally by the encoder, I can guarantee that the lifetime of `ByteBuffer` is longer than the lifetime of the `BlockHash`, which does this `MatchingBytes` stuff. Therefore, it should be safe to just expose the pointer!

```csharp
sPtr = source.DangerousGetBytePointer();
tPtr = target.DangerousGetBytePointer();

for (; (srcLength - sindex) >= 32 && (trgLength - tindex) >= 32 && bytesFound <= maxBytes - 32; bytesFound += 32, tindex += 32, sindex += 32)
{
    var lv = Avx2.LoadDquVector256(&sPtr[sindex]);
    var rv = Avx2.LoadDquVector256(&tPtr[tindex]);
    if (Avx2.MoveMask(Avx2.CompareEqual(lv, rv)) == EQMASK) continue;
    break;
}
```

Not only is this much simpler code than with `System.Numerics.Vector<T>`, because the overhead from loading a `Span<byte>` was completely eliminated, `MatchingBytes` takes negligible time compared to the `Vector<T>` version.

![no span overhead](https://user-images.githubusercontent.com/1000503/74582130-8c38d180-4f85-11ea-994f-a64fa11d5246.png)


## Squeezing every last drop out

I can still do better though. Instead of fetching the pointer from the `ByteBuffer`s every time `MatchingBytes` is called, it would be better and safer in terms of lifetime management, if the pointer was just passed down from the call site. This way, I save a method call, and I can be sure that I don't leave any dangling pointers behind as well.

![vectorized](https://user-images.githubusercontent.com/1000503/74581977-036d6600-4f84-11ea-947f-f80a0af683ae.png)

It turns out that on the vectorized version that this barely saves any time at all. Still, less instructions means less time, and at this point I have no idea what else I can do to make this faster. An encoding time of 121ms is a respectable time compared to around 100ms for xdelta3 (benchmarked unscientifically using `Measure-Command`). 

What's more interesting though, is how using raw points affects the scalar path. I removed `System.Numerics.Vector<T>` from the code completely, as repeatedly accessing `Span` from a `Memory<T>` was just too much overhead to deal with. It turns out, that **the overhead of getting a Span in a tight loop completely negates any gains from using `Vector<T>`!** 

![scalar](https://user-images.githubusercontent.com/1000503/74582016-5d6e2b80-4f84-11ea-95b1-caa57fb3cb9d.png)

`MatchingBytesToRight` here is using a completely scalar path; its running on `netcoreapp3.0` which does not support intrinsics. Notice that it's performing better than the implementation with `System.Numerics.Vector<T>` shown a bit earlier!

## Some final notes

At this point, the code looks more like C than C#. I guess if you want speed, passing pointers around is the way to do achieve it. I'm both impressed at the ease of which `Span<T>` and `Memory<T>` makes it easy to manage pointer lifetimes and act as a "view" over some contiguous memory, and disappointed at the fact that they're still not zero-cost. In tight loops, repeatedly grabbing `Span`s of already allocated memory costs way too much to be useful, and if performance is a requirement, you have no choice but to rely on `unsafe` code and pointer arithmetic. 

There were also a lot of micro-optimizations I didn't talk much about in this article, like using fields instead of properties; since properties incurred a small but non-negligible cost to access. [Array.Fill](https://docs.microsoft.com/en-us/dotnet/api/system.array.fill?view=netcore-3.1) instead of looping through an array to fill it, also gave some small time savings.

Considering the 6-8 second encoding times starting out, I think an encoding time of ~150ms is highly respectable, especially considering the overhead of a garbage collector and a JIT compiler. It was a fun detour to take on for a week, and taught me a lot about how you can take advantage of SIMD intrinsics in C#.

You can find the source code for this work on [GitHub](https://github.com/SnowflakePowered/vcdiff/), uncreatively named vcdiff, and licensed under the Apache License 2.0. You can also find vcdiff on [NuGet](https://www.nuget.org/packages/VCDiff). The version number is on 3.x since I changed the API twice from the original source code. It supports both encoding and decoding uncompressed open-vcdiff, and xdelta3 format VCDIFF patches, as well as plain RFC3284-compliant, non-checksummed VCDIFF. 

If I had some more time, I would have liked to do some proper benchmarks against [deltaq](https://www.nuget.org/packages/deltaq/). I suspect though, that vcdiff will perform quite a lot better, but that's only due to my use (abuse?) of unsafe pointer arithmetic and SIMD intrinsics.
