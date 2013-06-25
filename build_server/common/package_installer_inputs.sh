#!/bin/bash -xe

# common script sourced from a platform-specific wrapper that sets up the environment.

if [ "${BUILD_STEP}" != "package_installer_inputs.sh" ]; then
  1>&2 echo "don't run this script directly. use one of the platform-specific package_installer_input.sh wrappers."
  exit 1
fi

_zip_target="airspace.tgz"
_zip_share_target="airspace_${BUILD_IDENTIFIER}.tgz"

if [ -f "${_zip_target}" ]; then
  /bin/rm -f "${_zip_target}"
fi

if "${TAR}" czvf "${_zip_target}" build_products; then
  if [ "${LOCAL_BUILD}" != "true" ]; then
    if [ ! -d "${BUILD_SHARE}" ]; then
      mkdir -p "${BUILD_SHARE}"
    fi
    vcp -f "${_zip_target}" "${BUILD_SHARE}/${_zip_share_target}"
  else
    /bin/mv -f "${_zip_target}" "${_zip_share_target}"
  fi
else
  1>&2 echo "Error: Failed archiving ${_zip_target} - Exiting."
  exit 1
fi
