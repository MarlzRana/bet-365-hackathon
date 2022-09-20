const { WebSocket } = require('ws');
const axios = require('axios');

const ws = new WebSocket('wss://service.codechallenge.co.uk/socket');

let timeoutInterval;

let nextIndexMatchLiveTime = 0;

ws.on('open', (open) => {
  ws.send(`connect|{"teamName":"FTGS","password":"3TGpassword"}`);
  ws.send(`echo|HelloWorld`);
  //   ws.send(`matchlivegoals|`);
  //   ws.send('matchlivexy|');
  ws.send('matchlivetimes|');
});

ws.on('message', (res) => {
  res = res.toString().split('|');
  const opcode = res[0];
  const operand = res[1];
  console.log(`Data received: ${opcode} ${operand}`);

  if (opcode == 'matchlivegoals') {
    if (operand.indexOf('http') != -1) {
      readCSV(operand, handleMatchLiveGoals);
    }
  } else if (opcode == 'matchlivexy') {
    if (operand.indexOf('http') != -1) {
      readCSV(operand, handleMatchLiveExy);
    }
  } else if (opcode == 'matchlivetimes') {
    if (operand.indexOf('http') != -1) {
      readCSV(operand, handleMatchLiveTimes);
    }
  }
});

const readCSV = (url, nextFunction) => {
  axios.get(url).then((res) => {
    const data = res.data.split('\n');
    nextFunction(data);
  });
};

const handleMatchLiveGoals = (data) => {
  for (let i = 1; i < data.length; i++) {
    ws.send(`matchlivegoals|${data[i].replace(',', '|')}`);
  }
};

const handleMatchLiveExy = (rawData) => {
  rawData.shift();
  let data = [];
  for (item of rawData) {
    let nextEvent = [];
    let parts = item.split(',');
    nextEvent.push(parts[0]);
    nextEvent.push(parts[1]);
    if (parts[2] != '') {
      nextEvent.push(parts[2].split(':').map((a) => parseInt(a)));
    }
    data.push(nextEvent);
  }

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] == 'goal') {
      ws.send(`matchlivexy|goal|${data[i][1]}|`);
    } else {
      let posType = possesionType(data[i][1], data[i][2][0], data[i][2][1]);
      ws.send(`matchlivexy|${posType}|${data[i][1]}|${data[i][2].join(':')}`);
    }
  }
};

const handleMatchLiveTimes = (rawData) => {
  rawData.shift();
  rawData.shift();
  let data = [];
  for (item of rawData) {
    let nextEvent = [];
    let parts = item.split(',');
    nextEvent.push(parts[0]);
    nextEvent.push(parts[1]);
    if (parts[2] != '') {
      nextEvent.push(parts[2].split(':').map((a) => parseInt(a)));
    }
    nextEvent.push(
      parts[3]
        .split(':')
        .map((a, b) => parseInt(b == 0 ? parseInt(a) * 60 : a))
        .reduce((a, b) => a + b, 0)
    );
    data.push(nextEvent);
  }

  let nextIndex = [0];
  ws.send('matchlivetimes|kickoff||');
  const baseTime = Date.now();
  console.log('test');
  timeoutInterval = setInterval(
    () => timeoutLooper(baseTime, data, data.length),
    1000
  );
};

const possesionType = (team, x, y) => {
  let posType = 'possession';
  // Home Goal = 0, Away Goal = 400
  if (team == 'home') {
    if (x > 266) {
      posType = 'attack';
    }
    if (x == 30 && (y == 60 || y == 120)) {
      posType = 'goalkick';
    }
    if ((y == 180 || y == 0) && x == 400) {
      posType = 'corner';
    }
  } else if (team == 'away') {
    if (x < 400 / 3) {
      posType = 'attack';
    }
    if (x == 370 && (y == 60 || y == 120)) {
      posType = 'goalkick';
    }
    if ((y == 180 || y == 0) && x == 0) {
      posType = 'corner';
    }
  }
  return posType;
};

const timeoutLooper = (baseTime, arrCSV, indexOfLastEvent) => {
  console.log(nextIndexMatchLiveTime);
  nextIndexMatchLiveTime++;
  console.log(arrCSV);
  // const currentTime = Date.now();
  // let offset = currentTime - baseTime;
  // if (offset == arrCSV[nextIndexMatchLiveTime][3]) {
  //   if (data[nextIndexMatchLiveTime][0] != 'goal') {
  //     let posType = possesionType(
  //       data[nextIndexMatchLiveTime][1],
  //       ...data[nextIndexMatchLiveTime][2]
  //     );
  //     ws.send(
  //       `matchlivetimes|${posType}|${data[nextIndexMatchLiveTime][1]}|${data[
  //         nextIndexMatchLiveTime
  //       ][2].join(':')}`
  //     );
  //   } else {
  //     ws.send(`matchlivetimes|goal|${data[nextIndexMatchLiveTime][1]}|`);
  //   }
  //   nextIndexMatchLiveTime++;
  //   console.log(nextIndexMatchLiveTime);
  //   console.log('im here');
  //   if (nextIndexMatchLiveTime == indexOfLastEvent)
  //     clearInterval(timeoutInterval);
  // }
};
