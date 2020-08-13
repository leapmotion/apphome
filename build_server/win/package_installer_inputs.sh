#!/bin/bash -ex

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
"${NPM}" install archiver@1.2.0 fs-extra@0.6.1 readable-stream@2.2.2 tar-stream@1.5.2 glob@7.1.1 async@2.1.4 lodash@4.17.2
"${NPM}" install

cd "${AIRSPACE_REPO_DIR}/bin"
_winnode=$(echo "${NODE}" | sed 's/\//\\/g' | sed 's/\\c\\/C:\\/')
"${_winnode}" build

cd "${AIRSPACE_REPO_DIR}/build"

if [ -d build_products ]; then
  mv build_products build_products_old
  rm -rf build_products_old
fi

#for some terrible reason a  process is hanging on to unpacked
#directory for some period of time. give it a couple tries before failing.
#this particular section of the build script has been a source of build failures.
#is antivirus or some shell extension grabbing the new folder?
_retries=0
while [ ${_retries} -lt 5 -a ! -d build_products ]; do
  mv windows build_products && true
  _retries=$((_retries+1))
  sleep 5
done

if [ ! -d build_products ]; then
  echo "could not rename windows/ to build_products/"
  exit 1
fi

echo "${AIRSPACE_VERSION_STRING}" > build_products/version.txt
git rev-parse HEAD > build_products/head_sha.txt

#does the actual archiving of build_products & copying to shared location.
echo "Archiving build products..."
source "${BUILD_SCRIPT_COMMON_DIR}/package_installer_inputs.sh"
