class LANPeerConnection extends RTCPeerConnection {
  constructor(...args) {
    super(...args);
    
    //ios safari workaround https://bugs.webkit.org/show_bug.cgi?id=172867
    this.__proto__ = LANPeerConnection.prototype; 

    this.send = async () => {};

    this._signalingDataChannelOpenHandler = ({target}) => {

      this.send = async desc => {
        target.send(JSON.stringify(desc));
      }

      target.onmessage = ({data}) => {
        const o = JSON.parse(data);
        this.setRemoteDescription(o);
      };
    };

    // this is triggered by createDataChannel and addTrack call
    this.addEventListener('negotiationneeded', async () => {
      const o = await this.createOffer();
      await this.setLocalDescription(o);
    });

    // this is triggered by setRemoteDescription call
    this.addEventListener('signalingstatechange', async () => {

      if (this.signalingState == 'have-remote-offer') {
        const o = await this.createAnswer();
        await this.setLocalDescription(o);

        await this.send(await this._getLocalDescription());
        return
      }

      if (this.signalingState == 'have-local-offer'){
        await this.send(await this._getLocalDescription());
        return;
      }

    });

    // connected
    this.addEventListener('datachannel', ({channel}) => {
      if (channel.label == 'signaling') {
        channel.onopen = this._signalingDataChannelOpenHandler;
      }
    });
  }

  createSignalingDataChannel() {
    const ch = this.createDataChannel('signaling');
    ch.onopen = this._signalingDataChannelOpenHandler;
  }

  _getLocalDescription() {
    if (this.iceGatheringState == 'complete') {
      return Promise.resolve(this.localDescription);
    }

    return new Promise((resolve, _) => {
      const h = () => {
        if (this.iceGatheringState == 'complete') {
          this.removeEventListener('icegatheringstatechange', h);
          return resolve(this.localDescription);
        }
      };

      this.addEventListener('icegatheringstatechange', h);
    });
  }

  

}

