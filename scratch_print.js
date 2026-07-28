const fs = require('fs');
const { execSync } = require('child_process');

const device = '/dev/tty.MTP-3_B2C1';
try {
  console.log("Setting baudrate to 115200 on TTY device: " + device);
  execSync(`stty -f ${device} 115200 -crtscts -dsrflow clocal cs8 -cstopb -parenb`);
  
  console.log("Opening TTY device at 115200 (waiting for Bluetooth connection)...");
  const fd = fs.openSync(device, 'r+');
  console.log("TTY Port connected successfully!");
  
  const bytes = Buffer.concat([
    Buffer.from([0x1b, 0x40]), // ESC @ (Initialize)
    Buffer.from("\n\n* ZAIQA MAHAL *\n"),
    Buffer.from("DIRECT TTY 115200 PRINT\n"),
    Buffer.from("TEST SUCCESSFUL!\n\n"),
    Buffer.from([0x1b, 0x64, 0x05]), // ESC d 5 (Feed 5 lines)
    Buffer.from([0x0a, 0x0d]) // LF + CR
  ]);
  
  fs.writeSync(fd, bytes);
  console.log("Bytes written. Waiting 1 second before closing...");
  
  setTimeout(() => {
    fs.closeSync(fd);
    console.log("TTY Port closed.");
    process.exit(0);
  }, 1000);
  
} catch (err) {
  console.error("Error with TTY device connection:", err.message);
  process.exit(1);
}
