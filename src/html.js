import React from 'react'
import Helmet from 'react-helmet'
//import stylesStr from '!raw-loader!../public/styles.css'

export default class HTML extends React.Component {
  render() {
    const head = Helmet.rewind()
    // let css
    // if (process.env.NODE_ENV === 'production') {
    //   css = (
    //     <style
    //       id="gatsby-inlined-css"
    //       dangerouslySetInnerHTML={{ __html: stylesStr }}
    //     />
    //   )
    // }
    //  {css}
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          {this.props.headComponents}
          <link
            href="/img/apple-touch-icon-180x180.png"
            rel="apple-touch-icon"
            sizes="180x180"
          />
          <link
            rel="icon"
            type="image/png"
            href="/img/favicon-16x16.png"
            sizes="16x16"
          />
          <link
            rel="icon"
            type="image/png"
            href="/img/favicon-32x32.png"
            sizes="32x32"
          />
          <link
            rel="icon"
            type="image/png"
            href="/img/pwa-192x192.png"
            sizes="192x192"
          />
          <link href="/img/favicon.ico" rel="icon" type="image/x-icon" />
          <meta name="msapplication-config" content="/img/browserconfig.xml" />
        </head>
        <body>
          <div
            id="___gatsby"
            dangerouslySetInnerHTML={{ __html: this.props.body }}
          />
          {this.props.postBodyComponents}
          <script
            async
            src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
          />
        </body>
      </html>
    )
  }
}
