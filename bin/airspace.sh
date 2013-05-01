NW_VERSION=0.5.1

cd "`cd $(dirname $0)/..; pwd`"
if [ "`uname`" == "Darwin" ]; then
  nw/node-webkit-v$NW_VERSION-osx-ia32/node-webkit.app/Contents/MacOS/node-webkit .
elif [ "`uname`" == "Linux" ]; then
  nw/node-webkit-v$NW_VERSION-linux-ia32/nw .
else
  echo "Unknown operating system: `uname`"
  exit 1
fi

