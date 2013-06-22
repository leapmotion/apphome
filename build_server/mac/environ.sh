#!/bin/bash -e
#
#mac version of environ.sh environment setup.
#this file is intended to be sourced, not executed.

#when bash is not executed with --login the /bin directory may be at the end of the path.
#this is a particular headache when using "find" or other commands with bash/win name collisions.
export PATH=".:/opt/local/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"

#
#platform-specific environment setup
#

export NODE
NODE=$(which node) || true
if [ ! -x "${NODE}" ]; then
  NODE="/usr/local/bin/node"
fi

if [ ! -n "${BUILD_CRT}" ]; then
  export BUILD_CRT=libstdc++
  echo "Warning: BUILD_CRT was not set. Defaulting to ${BUILD_CRT}"
fi

if [ "${BUILD_CRT}" == "libc++" ]; then
  if [ "${BUILD_PRODUCT}" != "None" ]; then
    echo "BUILD_CRT is ${BUILD_CRT}. Forcing BUILD_PRODUCT from ${BUILD_PRODUCT} to None."
    BUILD_PRODUCT=None
  fi
fi

#
#common environment setup
#

_default_build_arch=x64
_default_build_plat=mac
_multi_config_build=false

export SHARE_ROOT
if [ ! -n "${SHARE_ROOT}" ]; then
  SHARE_ROOT="/Users/tombuilder/LeapMotion/OcuShare"
fi

# avoid overwriting _plat_script_dir as environ.sh is called by others
_environ_plat_script_dir=$(dirname "${0}")
source "${_environ_plat_script_dir}/../common/environ.sh"

unset _default_build_arch _default_build_plat _multi_config_build _environ_plat_script_dir

logEnviron

cat << EOF
Mac Environment
===============
BUILD_CRT=${BUILD_CRT}


EOF
