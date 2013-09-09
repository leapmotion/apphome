#!/bin/bash -e

#mac version of package_installer_inputs.sh build step

#must source this first. done in 2 steps to be space-safe.
_air_script_dir=$(dirname "${0}")
source "${_air_script_dir}"/environ.sh

if [ ! -x "${TAR}" ]; then
  1>&2 echo "Error: ${TAR} archiver required to package installer inputs."
  exit 1
fi

cd "${AIRSPACE_REPO_DIR}"
mkdir -p node_modules
${NPM} install archiver
${NPM} update

cd "${AIRSPACE_REPO_DIR}/bin"
${NODE} build

cd "${AIRSPACE_REPO_DIR}/build"

if [ -d build_products ]; then
  /bin/rm -rf build_products
fi

if [ -z "${LIBRARY_DIR}" ]; then
  LIBRARY_DIR=/opt/local/Libraries
fi

# Assume OS X 10.6 build of node-webkit has been committed to homebase repo,
# no need to copy from ${LIBRARY_DIR}/node-webkit-*
cp -r osx build_products

echo "${AIRSPACE_VERSION_STRING}" > build_products/version.txt
git rev-parse HEAD > build_products/head_sha.txt

#does the actual archiving of build_products & copying to shared location.
source "${BUILD_SCRIPT_COMMON_DIR}/package_installer_inputs.sh"
