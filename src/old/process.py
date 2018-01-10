from os import listdir
import os
from os.path import isfile, join
from sys import argv
from os.path import basename
import shutil

onlyfiles = [f for f in listdir(os.getcwd()) if isfile(join(os.getcwd(), f))]

for file in onlyfiles:
  dirname = os.path.splitext(file)[0]
  os.mkdir(dirname)
  shutil.copyfile(file, dirname + '/index.md')
