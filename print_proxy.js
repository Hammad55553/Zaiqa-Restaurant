const net = require('net');
const fs = require('fs');
const { execSync } = require('child_process');

const device = '/dev/cu.MTP-3_B2C1';
const PORT = 9100;

const server = net.createServer((socket) => {
  console.log('Print Proxy: CUPS connection received.');
  
  let dataBuffer = [];
  
  socket.on('data', (chunk) => {
    dataBuffer.push(chunk);
  });
  
  socket.on('end', () => {
    const fullData = Buffer.concat(dataBuffer);
    console.log(`Print Proxy: Received job (${fullData.length} bytes). Forwarding to Bluetooth...`);
    
    try {
      // Configure serial port settings
      execSync(`stty -f ${device} 115200 -crtscts -dsrflow clocal cs8 -cstopb -parenb`);
      
      // Open device
      const fd = fs.openSync(device, fs.constants.O_RDWR | fs.constants.O_NONBLOCK);
      
      // Wait 2 seconds for Bluetooth serial line to establish connection
      setTimeout(() => {
        try {
          fs.writeSync(fd, fullData);
          console.log('Print Proxy: Data successfully written to Bluetooth printer!');
          
          setTimeout(() => {
            fs.closeSync(fd);
            console.log('Print Proxy: Device closed.');
          }, 1000);
        } catch (writeErr) {
          console.error('Print Proxy: Error writing to serial device:', writeErr);
        }
      }, 2000);
      
    } catch (err) {
      console.error('Print Proxy: Error configuring/opening serial device:', err.message);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Print Proxy Server running on 127.0.0.1:${PORT}`);
});
