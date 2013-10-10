#!/bin/bash -e

#windows version of package_installer_inputs.sh build step

#must source this first. done in 2 steps to be space-safe.
_air_script_dir=$(dirname "${0}")
source "${_air_script_dir}"/environ.sh

if [ ! -x "${TAR}" ]; then
  1>&2 echo "Error: ${TAR} archiver required to package installer inputs."
  exit 1
fi

cd "${AIRSPACE_REPO_DIR}"
mkdir -p node_modules
"${NPM}" install archiver
"${NPM}" install 

cd "${AIRSPACE_REPO_DIR}/bin"
_winnode=$(echo "${NODE}" | sed 's/\//\\/g' | sed 's/\\c\\/C:\\/')
"${_winnode}" build

cd "${AIRSPACE_REPO_DIR}/build"

if [ -d build_products ]; then
  /bin/rm -rf build_products
fi

cp -r windows build_products

echo "${AIRSPACE_VERSION_STRING}" > build_products/version.txt
git rev-parse HEAD > build_products/head_sha.txt

#does the actual archiving of build_products & copying to shared location.
echo "Archiving build products..."
source "${BUILD_SCRIPT_COMMON_DIR}/package_installer_inputs.sh"
