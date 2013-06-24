#!/bin/bash -e
#
#windows version of environ.sh environment setup.
#this file is intended to be sourced, not executed.

#when bash is not executed with --login on windows the /bin directory is at the end of the path.
#this is a particular headache when using "find" or other commands with bash/win name collisions.
export PATH=".:/bin:${PATH}"

#
#platform-specific environment setup
#

#find the required build tools
export NODE
export ZIP

NODE=$(which node) || true
if [ ! -x "${NODE}" ]; then
  NODE="${PROGRAMFILES//\\//}/nodejs/node.exe"
fi

#
#common environment setup
#

_default_build_arch=x86
_default_build_plat=win

export SHARE_ROOT
if [ ! -n "${SHARE_ROOT}" ]; then
  SHARE_ROOT="//ocuserv2"
fi

# avoid overriding _plat_script_dir as environ.sh is called by others
_environ_plat_script_dir=$(dirname "${0}")
source "${_environ_plat_script_dir}/../common/environ.sh"

unset _default_build_arch _default_build_plat _multi_config_build _environ_plat_script_dir

logEnviron

cat << EOF
Win Environment
===============
BUILD_X64_APPS=${BUILD_X64_APPS}
BUILD_X64_INSTALLER=${BUILD_X64_INSTALLER}
LIBRARY_SHARE=${LIBRARY_SHARE}

EOF
