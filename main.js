const axios = require('axios');
const WebSocketClient = require('websocket').client;
const { IncomingWebhook } = require('@slack/client');

const socketConnect = async function() {
  const client = new WebSocketClient();
  const address = process.env.ETHER_ADDRESS;
  let opened = false;
  client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
    setTimeout(socketConnect, 1000);
  });

  client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    opened = true;
    const initParams = {'event': 'txlist', 'address': address};
    connection.sendUTF(JSON.stringify(initParams));
    setInterval(() => opened ? connection.sendUTF(JSON.stringify({'event': 'ping'})) : 1 ,
      1500);
    connection.on('error', function(error) {
      console.log('Connection Error: ' + error.toString());
      opened = false;
      setTimeout(socketConnect, 1000);
    });
    connection.on('close', function() {
      console.log('echo-protocol Connection Closed');
      opened = false;
      setTimeout(socketConnect, 1000);
    });
    connection.on('message', function(message) {
      console.log(message);
      if (message.type === 'utf8') {
        const data = JSON.parse(message.utf8Data);
        console.log(data);
        if (data.result) sendMessageToSlack(data.result[0]);
      }

    });
  });
  setTimeout(() => client.abort(), 1500);
  client.connect('ws://socket.etherscan.io/wshandler');
};

const sendMessageToSlack = function(transaction) {
  const url = process.env.SLACK_WEBHOOK_URL;
  const webhook = new IncomingWebhook(url);
  const message = `new transaction have been catched! - <https://etherscan.io/tx/${transaction.hash}|${transaction.hash}>`;

  webhook.send(message, function(err, res) {
    if (err) {
      console.log('Error:', err);
    } else {
      console.log('Message sent: ', res);
    }
  });
};

socketConnect();
