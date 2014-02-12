#!/bin/bash -e
#
#common version of environ.sh environment setup.
#this file is intended to be sourced, not executed.
#there should be nothing conditional on platform type in this file.
#each platform has additional platform-specific environment setup it does.
#this file is source from the platform versions of environ.sh

if [ ! -n "${_default_build_arch}" -o ! -n "${_default_build_plat}" -o ! -n "${SHARE_ROOT}" ]; then
  1>&2 echo "Error: _default_build_arch, _default_build_plat and SHARE_ROOT must be set before sourcing common/environ.sh"
  exit 1
fi

export BUILD_STEP=$(basename "${0}")

if [ ! -n "${BUILD_PLAT}" ]; then
  export BUILD_PLAT=${_default_build_plat}
  echo "Warning: BUILD_PLAT was not set. Defaulting to ${BUILD_PLAT}"
fi

export BUILD_BRANCH=${GIT_BRANCH}

#BUILD_ARCH should be set in jenkins execute shell script build step
#before invocation of build step.

export BUILD_ARCH
if [ ! -n "${BUILD_ARCH}" ]; then
  BUILD_ARCH=${_default_build_arch}
  echo "Warning: BUILD_ARCH was not set. Defaulting to ${BUILD_ARCH}"
fi

if [ ! -n "${BUILD_BRANCH}" ]; then
  export BUILD_BRANCH="origin/develop"
  echo "Warning: GIT_BRANCH and BUILD_BRANCH were not set. Defaulting to ${BUILD_BRANCH}"
fi

_branch_basename=$(basename "${BUILD_BRANCH}")

case "${_branch_basename}" in
release-*) _branch_basename=release; _access=public; _Access=Public ;;
hotfix-*) _branch_basename=hotfix; _access=public; _Access=Public ;;
#if there are any special internal-only branches they can go here. otherwise build products go in public products cache
*) _access=public; _Access=Public;;
esac

if [ -z "$AIRSPACE_OUT_DIR" ]; then
  export AIRSPACE_OUT_DIR="$_branch_basename"
  echo "Airspace output directory is not set. Defaulting to $_branch_basename."
fi

export BUILD_SHARE
BUILD_SHARE="${SHARE_ROOT}/Builds/BuildProducts/${_Access}/${BUILD_PLAT}/${AIRSPACE_OUT_DIR}"

export AIRSPACE_REPO_DIR
if [ -d "${WORKSPACE}" ]; then
  AIRSPACE_REPO_DIR="${WORKSPACE}"
else
  echo "Warning: ${0} invoked outside of Jenkins environment. YMMV."
  AIRSPACE_REPO_DIR=$(dirname "${0}")/../..
  AIRSPACE_REPO_DIR=$(cd "${AIRSPACE_REPO_DIR}"; pwd)
fi

#location of build step scripts
export BUILD_SCRIPT_DIR="${AIRSPACE_REPO_DIR}/build_server/${BUILD_PLAT}"
export BUILD_SCRIPT_COMMON_DIR="${AIRSPACE_REPO_DIR}/build_server/common"

export JENKINS_BUILD_NUMBER=${BUILD_NUMBER}

#source directory pulled from git
AIRSPACE_REPO_DIR=$(cd "${AIRSPACE_REPO_DIR}" && pwd)
AIRSPACE_VERSION=$(cat "${AIRSPACE_REPO_DIR}/package.json" | grep "version" | awk -F'[\"\-]' '{ print $4 }')
AIRSPACE_BUILD=$("${BUILD_SCRIPT_COMMON_DIR}"/get-build-number.sh)
AIRSPACE_VERSION_STRING="${AIRSPACE_VERSION}+${AIRSPACE_BUILD}"

#final archive name will be <product>_${BUILD_IDENTIFIER}.<archive_format_ext>
#e.g. Platform_master_public_win_x86_0.8.1+5912.zip
export BUILD_IDENTIFIER="${_branch_basename}_${_access}_${BUILD_PLAT}_${BUILD_ARCH}_${AIRSPACE_VERSION_STRING}"

unset _audience

#define build tools
if [ ! -x "${NODE}" ]; then
  export NODE=$(which node)
fi

if [ ! -x "${NPM}" ]; then
  export NPM=$(which npm)
fi

if [ ! -x "${TAR}" ]; then
  export TAR=$(which tar)
fi

#verified file copy
function vcp() {
  #need to detect if it is a copy to the file share and substitute use of SCP for CP 
  local _a
  local _src
  local _dst
  local _scp_dst
  
  #get the last 2 arguments.
  #for file copies that are candidates for scp they will
  #be source and destination.
  for _a in "${@}"; do
    _src=${_dst}
    _dst=${_a}
  done
  
  #if present in the _dst string the mounted share root
  #will be replaced with an scp user, server, directory specification
  _scp_dst=${_dst/${SHARE_ROOT}/tombuilder@ocuserv2:\/var}

  #if a substitution was done and the source is a regular file
  #use scp instead. this is a workaround for the problem of files
  #disappearing from the share folders. fedora samba is the current suspect.
  #if this fixes it we know that's where to look.
  if [ "$(hostname)" != "ocuserv2.leap.corp" -a -f "${_src}" -a "${_dst}" != "${_scp_dst}" -a "${LOCAL_BUILD}" != "true" ]; then
    echo "${_src} --> ${_scp_dst}"
    if scp -pB "${_src}" "${_scp_dst}"; then
      return 0
    fi
  else
    if cp -v "${@}"; then
      return 0
    fi
  fi
  
  1>&2 echo "Error: File copy failed - Exiting."
  
  exit 1
}

function logEnviron() {
cat << EOF
Common Environment
==================
BUILD_SHARE=${BUILD_SHARE}
AIRSPACE_REPO_DIR=${AIRSPACE_REPO_DIR}
JENKINS_BUILD_NUMBER=${JENKINS_BUILD_NUMBER}
AIRSPACE_VERSION=${AIRSPACE_VERSION}
AIRSPACE_BUILD=${AIRSPACE_BUILD}
AIRSPACE_VERSION_STRING=${AIRSPACE_VERSION_STRING}

BUILD_IDENTIFIER=${BUILD_IDENTIFIER}
NODE=${NODE}
NPM=${NPM}
EOF
}
