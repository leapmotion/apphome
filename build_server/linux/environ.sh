#!/bin/bash -e
#
#linux version of environ.sh environment setup.
#this file is intended to be sourced, not executed.

#when bash is not executed with --login the /bin directory may be at the end of the path.
#this is a particular headache when using "find" or other commands with bash/win name collisions.
export PATH=".:/usr/local/bin:/usr/bin:/bin:${PATH}"

#
#platform-specific environment setup
#

#
#common environment setup
#

_default_build_arch=x64
_default_build_plat=linux
_multi_config_build=false

export SHARE_ROOT
if [ ! -n "${SHARE_ROOT}" ]; then
  SHARE_ROOT="/var"
fi

_environ_plat_script_dir=$(dirname "${0}")
source "${_environ_plat_script_dir}/../common/environ.sh"

unset _default_build_arch _default_build_plat _multi_config_build _environ_plat_script_dir

logEnviron
