## Airspace Desktop

### Running (dev mode)

    node bin/airspace

### Testing

    npm test

### Building

    node bin/build

Outputs to: <code>build/</code>

### Notes

* 64-bit Ubuntu requires 32-bit GTK libs: <code>sudo apt-get install ia32-libs-gtk</code>
* If RCEDIT.exe fails, make sure your virus scanner has the build folder listed as an exception - they scan files as they're created, and this causes access violations when RCEDIT goes to change the icon.
