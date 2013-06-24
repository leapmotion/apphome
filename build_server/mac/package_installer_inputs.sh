#!/bin/bash -e

#mac version of package_installer_inputs.sh build step

#must source this first. done in 2 steps to be space-safe.
_plat_script_dir=$(dirname "${0}")
source "${_plat_script_dir}"/environ.sh

if [ ! -x "${ZIP}" ]; then
  1>&2 echo "Error: ${ZIP} archiver required to package installer inputs."
  exit 1
fi

cd "${AIRSPACE_REPO_DIR}/bin"
${NODE} build

cd "${AIRSPACE_REPO_DIR}/build"

if [ -d build_products ]; then
  /bin/rm -rf build_products
fi

cp -r osx build_products

echo "${AIRSPACE_VERSION_STRING}" > build_products/version.txt
git rev-parse HEAD > build_products/head_sha.txt

_zip_target="airspace.tgz"
_zip_share_target="airspace_${BUILD_IDENTIFIER}.tgz"

if [ -f "${_zip_target}" ]; then
  /bin/rm -f "${_zip_target}"
fi

pwd
echo "\"${ZIP}\" -C \"${AIRSPACE_REPO_DIR}/build\" -czfv ${_zip_target} build_products"

if "${ZIP}" -C "${AIRSPACE_REPO_DIR}/build" -czvf ${_zip_target} build_products; then
  /bin/mv -f "${_zip_target}" "${_zip_share_target}"
  if [ ! -d "${BUILD_SHARE}" ]; then
    mkdir -p "${BUILD_SHARE}"
  fi
    vcp -f "${_zip_share_target}" "${BUILD_SHARE}/${_zip_share_target}"
else
  1>&2 echo "Error: Failed archiving ${_zip_target} - Exiting."
  exit 1
fi
