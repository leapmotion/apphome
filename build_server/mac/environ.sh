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


_default_build_arch=x64
_default_build_plat=mac
_multi_config_build=false

export SHARE_ROOT
if [ -z "${SHARE_ROOT}" ]; then
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
