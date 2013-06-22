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

#common default setup here
export LOCAL_BUILD=true
export BUILD_PLAT=win
export GIT_BRANCH="origin/production"
export JENKINS_BUILD_NUMBER=$$
export WORKSPACE=

_archs="x86"
_steps="package_installer_inputs"

# user-based overrides here

if [ "$(whoami)" = 'bherrera-laptop\benn' ]; then
  #if workspace is not set scripts detect environment as non-jenkins and don't do SDK/installer distrib.
  #this allows for local end-to-end testing.
  #requires that ${BUILD_SHARE}/Common/SDK and/or ${BUILD_SHARE}/Builds/SDK exist
  #because they are usually on the other end of network share build scripts do not try to create paths
  #when missing.
  #export WORKSPACE="${HOME}/LeapMotion/platform"
  #so local test builds don't get copied to actual share locations.
  #also saves on network copying of //ocuserv2/common/Docs - local (probably out of date) copy
  #exists in /c/LeapMotion/Common/Docs to allow the test build to run.
  export SHARE_ROOT="/c/LeapMotion"
  
  #CLEAN_BUILD=true
  #_steps="generate_projects"
  
  #_steps="build_platform"

  #BUILD_PRODUCT=Leap_SDK
  #_steps="generate_sdk"

  BUILD_PRODUCT=Internal_Installer
  #BUILD_X64_INSTALLER=true
  
  #_steps=generate_projects
  
  #_steps="generate_sdk generate_installer"
fi

if [ "$(whoami)" = 'wgray-pc\walter gray' ]; then
  export WORKSPACE="/e/code/platform/homebase"
  export SHARE_ROOT="/e/LeapMotion"
  export LIBRARY_DIR="/c/dev/Libraries"
  export LATEST_ROOT="/e/LeapMotion"
  export LOCAL_BUILD=true
  
  
  _archs=x86
  _steps="package_installer_inputs"
fi

function runSteps() {
  for step in ${_steps}; do

    for arch in ${_archs}; do
      export BUILD_ARCH=${arch}

      if [ "${step}" = "generate_sdk" -a "${arch}" != "x86" ]; then
        continue
      fi
      
      echo "Running build step ${step}[${BUILD_ARCH}]"
      if ./${step}.sh; then
        echo "build step ${step}[${BUILD_ARCH}] succeeded."
      else
        1>&2 echo "build step ${step}[${BUILD_ARCH}] failed."
        exit 1
      fi
    done
    
  done
}

runSteps | tee "${_script_name}".log
