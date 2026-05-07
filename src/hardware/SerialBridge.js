export class SerialBridge {
  constructor({ baudRate = 115200 } = {}) {
    this.baudRate = baudRate;
    this.port = null;
    this.writer = null;
    this.encoder = new TextEncoder();
    this.connected = false;
    this.supported = !!navigator.serial;
    this._writeQueue = Promise.resolve();
    this.onStatus = null;

    if (this.supported) {
      navigator.serial.addEventListener('disconnect', (event) => {
        if (event.target === this.port) this._markDisconnected('disconnected');
      });
    }
  }

  setStatusHandler(handler) {
    this.onStatus = handler;
    this._emitStatus(this.supported ? 'disconnected' : 'unsupported');
  }

  async connect() {
    if (!this.supported) {
      this._emitStatus('unsupported');
      return false;
    }
    if (this.connected) return true;

    try {
      this._emitStatus('connecting');
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
      this.writer = this.port.writable.getWriter();
      this.connected = true;
      this._emitStatus('connected');
      return true;
    } catch (error) {
      console.warn('[a common bloom] serial connect failed:', error);
      await this.disconnect();
      this._emitStatus('error');
      return false;
    }
  }

  async disconnect() {
    if (this.writer) {
      try {
        await this.writer.close();
      } catch (error) {
        console.warn('[a common bloom] serial writer close failed:', error);
      }
      try {
        this.writer.releaseLock();
      } catch (error) {}
      this.writer = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (error) {
        console.warn('[a common bloom] serial port close failed:', error);
      }
      this.port = null;
    }

    this.connected = false;
    this._emitStatus(this.supported ? 'disconnected' : 'unsupported');
  }

  async toggle() {
    if (this.connected) {
      await this.disconnect();
      return false;
    }
    return this.connect();
  }

  sendRealm(realm) {
    const value = realm === 'pentatonic' ? 'pentatonic' : 'blues';
    return this.send(`REALM:${value}`);
  }

  sendBloom(type) {
    if (!type) return Promise.resolve(false);
    return this.send(`BLOOM:${type}`);
  }

  sendBloomRgb(rgb) {
    if (!Array.isArray(rgb) || rgb.length < 3) return Promise.resolve(false);
    const [r, g, b] = rgb.map((value) => Math.max(0, Math.min(255, Math.round(value || 0))));
    return this.send(`BLOOMRGB:${r},${g},${b}`);
  }

  sendClear() {
    return this.send('CLEAR');
  }

  send(command) {
    if (!this.connected || !this.writer) return Promise.resolve(false);
    const line = command.endsWith('\n') ? command : `${command}\n`;
    this._writeQueue = this._writeQueue
      .then(() => this.writer.write(this.encoder.encode(line)))
      .then(() => true)
      .catch((error) => {
        console.warn('[a common bloom] serial write failed:', error);
        this._markDisconnected('error');
        return false;
      });
    return this._writeQueue;
  }

  _markDisconnected(status) {
    this.connected = false;
    this.writer = null;
    this.port = null;
    this._emitStatus(status);
  }

  _emitStatus(status) {
    if (this.onStatus) this.onStatus(status, this.connected);
  }
}
