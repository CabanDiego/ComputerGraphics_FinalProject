export function createSerialButton(onQuatUpdate) {
  // Button to connect to serial port
  const button = document.createElement("button");
  button.style.position = "absolute";
  button.style.top = "10px";
  button.style.left = "10px";
  button.textContent = "Connect to Serial Port";
  document.body.appendChild(button);

  button.onclick = async function connectSerial() {
    if (!("serial" in navigator)) {
      alert("Web Serial API not supported in this browser.");
      return;
    }
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 }); // Set your baud rate

      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable);
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line
        for (const line of lines) {
          const quat = parseSerialLine(line.trim());
          if (quat) onQuatUpdate(quat);
        }
      }
    } catch (err) {
      alert("Serial connection error: " + err);
    }
  }
};

// Parse lines like: qW: 0.9781 qX: -0.0347 qY: 0.0022 qZ: -0.2050
function parseSerialLine(line) {
  const match = line.match(
    /qW:\s*([-\d.]+)\s+qX:\s*([-\d.]+)\s+qY:\s*([-\d.]+)\s+qZ:\s*([-\d.]+)/
  );
  if (match) {
    latestQuat = {
      w: parseFloat(match[1]),
      x: parseFloat(match[2]),
      y: parseFloat(match[3]),
      z: parseFloat(match[4])
    };
  }
}
