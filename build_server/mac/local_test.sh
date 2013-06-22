#!/bin/bash

#
# local_test.sh is for running local tests off of the build server.
# it requires that your machine be set up appropriately.
# this is not for general use.
# this script should not be run on the build server.
# the build step scripts should be used in separate build steps.
#


_script_name=$(basename "${0}")
_script_dir=$(dirname "${0}")
cd "${_script_dir}"

export LOCAL_BUILD=true
export BUILD_PLAT=mac
export BUILD_ARCH=x64
export UPDATE_LIBRARIES=false
export CLEAN_BUILD=false
export BUILD_CONFIG=Release
export BUILD_PRODUCT=Public_Installer
export GIT_BRANCH="origin/master"
export WORKSPACE="/Volumes/LEAPCODE/code/platform"
export SHARE_ROOT="/Volumes/LEAPCODE/LeapMotion"
export LIBRARY_DIR="/Volumes/LEAPCODE/code/Libraries"
export LATEST_ROOT="/Volumes/LEAPCODE/LeapMotion"

if [ "$(whoami)" = 'tnitz' ]; then
    export LOCAL_BUILD=true
    export BUILD_PLAT=mac
    export BUILD_ARCH=x64
    export UPDATE_LIBRARIES=false
    export CLEAN_BUILD=false
    export BUILD_CONFIG=Release
    export BUILD_PRODUCT=Public_Installer
    export GIT_BRANCH="airspace-integration"
    export WORKSPACE="/Users/tnitz/Projects/platform/platform"
    export SHARE_ROOT="/Users/tnitz/Projects/platform/LeapMotion"
    export LIBRARY_DIR="/opt/local/Libraries"
    export LATEST_ROOT="/Users/tnitz/Projects/platform/LeapMotion"
fi


export _num_cpus=$(sysctl hw.ncpu | awk '{print $2}')
_num_cpus=$((_num_cpus*2 - 2))

_steps="generate_projects build_platform generate_sdk generate_installer"

function runSteps() {
  for step in ${_steps}; do      
    for crt in "libstdc++" "libc++"; do
      export BUILD_CRT="${crt}"
      echo "Running build step ${step}[${BUILD_CRT}]"
      if ./${step}.sh; then
        echo "build step ${step}[${BUILD_CRT}] succeeded."
      else
        1>&2 echo "buid step ${step}[${BUILD_CRT}] failed."
        exit 1
      fi    
    done
  done
}

2>&1 runSteps | tee "${_script_name}".log
