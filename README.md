## Airspace Desktop

### Running (dev mode)

    node bin/airspace

### Testing

    npm test

### Building

    node bin/build

Outputs to: <code>build/</code>

### App Manifest

See <code>non-store-app-manifest.json</code>

Upload with:

    s3cmd put -P non-store-app-manifest.json s3://lm-assets/airspace-desktop/

App Store and Leap Community tiles can be uploaded with:


    s3cmd put -P static/images/icons/community-icon.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/icons/store-icon.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/tiles/community-tile.png s3://lm-assets/airspace-desktop/
    s3cmd put -P static/images/tiles/store-tile.png s3://lm-assets/airspace-desktop/

### Notes

* 64-bit Ubuntu requires 32-bit GTK libs: <code>sudo apt-get install ia32-libs-gtk</code>
* If RCEDIT.exe fails, make sure your virus scanner has the build folder listed as an exception-
  they scan files as they're created, and this causes access violations when RCEDIT goes to change the icon.

