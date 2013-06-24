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

export BUILD_PLAT=linux
export BUILD_ARCH=x64
export UPDATE_LIBRARIES=false
export CLEAN_BUILD=false
export BUILD_CONFIG=Release
export BUILD_PRODUCT=LeapSDK
export GIT_BRANCH="origin/master"

_steps="generate_projects build_platform generate_sdk generate_installer"

function runSteps() {
  for step in ${_steps}; do      
    echo "Running build step ${step}"
    if ./${step}.sh; then
      echo "build step ${step} succeeded."
    else
      1>&2 echo "buid step ${step} failed."
      exit 1
    fi    
  done
}

2>&1 runSteps | tee "${_script_name}".log
