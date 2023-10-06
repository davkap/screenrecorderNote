const { ipcRenderer } = require('electron');
const fs = require('fs');

let mediaRecorder;
let chunks = [];
let allNotes = [];
let noteStart;
let recordingStartTime;
let commonIdentifier; // New variable for common file identifier

// Element for displaying notes
const noteList = document.createElement('div');
noteList.setAttribute('id', 'noteList');
noteList.style.display = 'none';
document.body.appendChild(noteList);

document.getElementById('start').addEventListener('click', async () => {
  commonIdentifier = Date.now(); // Set the common identifier when recording starts

  try {
    const inputSources = await ipcRenderer.invoke('get-sources');
    const sourceList = document.createElement('ul');
    sourceList.setAttribute('id', 'sourceList');

    inputSources.forEach((source) => {
      const sourceItem = document.createElement('li');
      sourceItem.textContent = source.name;
      sourceItem.setAttribute('data-id', source.id);
      sourceItem.addEventListener('click', async (event) => {
        const selectedSourceId = event.target.getAttribute('data-id');
        await startRecording(selectedSourceId);
        sourceList.remove();
      });
      sourceList.appendChild(sourceItem);
    });

    document.body.appendChild(sourceList);
  } catch (error) {
    console.log("Error: ", error);
  }
});

document.getElementById('stop').addEventListener('click', () => {
  mediaRecorder.stop();
  document.getElementById('stop').disabled = true;
  saveNotesToSRT(commonIdentifier); // Pass commonIdentifier as an argument
});

document.getElementById('list').addEventListener('click', () => {
  if (noteList.style.display === 'none') {
    noteList.style.display = 'block';
  } else {
    noteList.style.display = 'none';
  }
});

const noteArea = document.getElementById('noteArea');

noteArea.addEventListener('input', () => {
  if (!noteStart) {
    noteStart = Date.now() - recordingStartTime;
  }
});

noteArea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const noteText = noteArea.value;
    const noteEnd = noteStart + 2000;
    allNotes.push({
      start: noteStart,
      end: noteEnd,
      text: noteText
    });
    noteArea.value = '';
    noteStart = null;
    updateNoteList();
  }
});

async function startRecording(selectedSourceId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: selectedSourceId,
      },
    },
  });

  mediaRecorder = new MediaRecorder(stream);
  recordingStartTime = Date.now();
  noteArea.focus();

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(`./video-${commonIdentifier}.webm`, buffer); // Use commonIdentifier here
    console.log("File has been saved!");
  };

  mediaRecorder.start();
  document.getElementById('stop').disabled = false;
  noteStart = null;
}

function saveNotesToSRT(identifier) {
  let srtContent = "";
  allNotes.forEach((note, index) => {
    srtContent += `${index + 1}\n`;
    srtContent += `${formatTime(note.start)} --> ${formatTime(note.end)}\n`;
    srtContent += `${note.text}\n\n`;
  });

  const buffer = Buffer.from(srtContent);
  fs.writeFileSync(`./notes-${identifier}.srt`, buffer); // Use commonIdentifier here
  console.log("Notes have been saved!");
}

function updateNoteList() {
  let listContent = "<ul>";
  allNotes.forEach((note, index) => {
    listContent += `<li>${index + 1}. ${note.text}</li>`;
  });
  listContent += "</ul>";
  noteList.innerHTML = listContent;
}

function formatTime(time) {
  let milliseconds = time % 1000;
  time = (time - milliseconds) / 1000;
  let seconds = time % 60;
  time = (time - seconds) / 60;
  let minutes = time % 60;
  let hours = (time - minutes) / 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}
