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
export GIT_BRANCH="origin/production"
export SHARE_ROOT=
export WORKSPACE=

export _num_cpus=$(sysctl hw.ncpu | awk '{print $2}')
_num_cpus=$((_num_cpus*2 - 2))

_steps="package_installer_inputs"

if [ "$(whoami)" = 'tnitz' ]; then
    export GIT_BRANCH="production"
fi

if [ "$(whoami)" = 'keithmertens' ]; then
  export GIT_BRANCH="production"
  export WORKSPACE="/Users/keithmertens/Desktop/OhSweetCode/homebase"
  export SHARE_ROOT="/Users/keithmertens/Desktop/OhSweetCode/LeapMotion"
fi

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
