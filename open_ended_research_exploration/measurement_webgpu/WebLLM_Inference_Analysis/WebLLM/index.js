import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const availableModels = webllm.prebuiltAppConfig.model_list.map((m) => m.model_id);
let selectedModel = "Llama-3.1-8B-Instruct-q4f32_1-1k";
let isFirstInput = true;  
let firstInferenceTime = null; 
let secondInferenceTime = null; 
let downloadStartTime = null;
let downloadEndTime = null;
let loadingStartTime = null;
let loadingEndTime = null;

function updateEngineInitProgressCallback(report) {
  console.log("initialize", report.progress, report.text);
  document.getElementById("download-status").textContent = report.text;

  // Detect download start
  if (report.text.includes('Downloading')) {
    if (downloadStartTime === null) {
      downloadStartTime = performance.now();
      console.log("Download started");
    }
  }

  // Detect download end
  if (report.text.includes('Finish downloading')) {
    if (downloadEndTime === null) {
      downloadEndTime = performance.now();
      console.log("Download finished");
    }
  }

  // Detect loading start
  if (report.text.includes('Loading')) {
    if (loadingStartTime === null) {
      loadingStartTime = performance.now();
      console.log("Loading started");
    }
  }

  // Detect loading end
  if (report.text.includes('Finish loading')) {
    if (loadingEndTime === null) {
      loadingEndTime = performance.now();
      console.log("Loading finished");
    }
  }

  if (downloadStartTime !== null && downloadEndTime !== null && loadingStartTime !== null && loadingEndTime !== null) {
    const downloadTime = downloadEndTime - downloadStartTime;
    const loadingTime = loadingEndTime - loadingStartTime;
    console.log(`Download time: ${downloadTime.toFixed(2)} ms`);
    console.log(`Loading time: ${loadingTime.toFixed(2)} ms`);
    const downloadTimeElement = document.getElementById("download-time");
    downloadTimeElement.textContent = `Download time: ${downloadTime.toFixed(2)} ms`;
    downloadTimeElement.classList.remove("hidden");

    const loadingTimeElement = document.getElementById("loading-time");
    loadingTimeElement.textContent = `Loading time: ${loadingTime.toFixed(2)} ms`;
    loadingTimeElement.classList.remove("hidden");
  }
}

const engine = new webllm.MLCEngine();
engine.setInitProgressCallback(updateEngineInitProgressCallback);

async function initializeWebLLMEngine() {
  document.getElementById("download-status").classList.remove("hidden");
  selectedModel = document.getElementById("model-selection").value;
  const config = {
    temperature: 1.0,
    top_p: 1,
  };

  const startTime = performance.now();
  await engine.reload(selectedModel, config);
  const endTime = performance.now();
  const totalInitTime = endTime - startTime;
  console.log(`Total initialization time: ${totalInitTime.toFixed(2)} ms`);
  if (downloadStartTime === null || downloadEndTime === null || loadingStartTime === null || loadingEndTime === null) {
    console.warn("Could not capture download and loading times separately.");
    console.log(`Total initialization time: ${totalInitTime.toFixed(2)} ms`);
    const totalTimeElement = document.getElementById("total-init-time");
    totalTimeElement.textContent = `Total initialization time: ${totalInitTime.toFixed(2)} ms`;
    totalTimeElement.classList.remove("hidden");
  }
}

/*************** New Functions ***************/
function readDataFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const fileName = file.name.toLowerCase();
      try {
        if (fileName.endsWith('.jsonl')) {
          const lines = event.target.result.split('\n');
          const dataArray = [];
          for (let line of lines) {
            line = line.trim();
            if (line) {
              const jsonData = JSON.parse(line);
              dataArray.push(jsonData);
            }
          }
          resolve(dataArray);
        } else if (fileName.endsWith('.json')) {
          const jsonData = JSON.parse(event.target.result);
          if (!Array.isArray(jsonData)) {
            throw new Error('JSON data is not an array');
          }
          resolve(jsonData);
        } else {
          throw new Error('Unsupported file format. Please upload a .json or .jsonl file.');
        }
      } catch (e) {
        reject(new Error("Invalid data format: " + e.message));
      }
    };
    reader.onerror = function (error) {
      reject(error);
    };
    reader.readAsText(file);
  });
}

// Function to sort data by output length in descending order
function sortDataByResponseLengthDescending(dataArray) {
  return dataArray.sort((a, b) => b.output.length - a.output.length);
}

let outputDataArray = [];
async function processDataFile(file) {
  let dataArray;
  try {
    dataArray = await readDataFileContent(file);
  } catch (error) {
    alert("Failed to read data: " + error.message);
    return;
  }
  if (!Array.isArray(dataArray)) {
    alert("Invalid data format: Expected an array of objects.");
    return;
  }
  document.getElementById("start-processing").disabled = true;
  outputDataArray = [];

  const inferenceTimes = [];
  const timeToFirstTokenTimes = []; 
  const normalizedLatencies = []; 
  let totalInferenceTime = 0;   
  let totalTokens = 0;         
  let totalPrefillSpeed = 0;
  let totalDecodingSpeed = 0;
  let totalTimeBetweenTokens = 0;
  let totalIntervals = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const sample = dataArray[i];
    const { instruction, input, output: expectedOutput } = sample;
    let prompt = `Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.\n\n`;
        prompt += `Instruction:\n${instruction}\n\n`;
          if (input && input.trim() !== "") {
            prompt += `Input:\n${input}\n\n`;
          }

    //prompt += `Response:`;

    console.log(prompt);

    const message = {
      content: prompt,
      role: "user",
    };
    const conversationMessages = [
      {
        content: "You are a helpful AI assistant.",
        role: "system",
      },
      message,
    ];
    const { totalTime, timeToFirstToken, usage, tokenIntervals } = await new Promise((resolve, reject) => {
      generateResponse(
        conversationMessages,
        (update) => {},
        (finalMessage, usage, times) => {
          console.log(`Sample #${i + 1} processed.`);
          //const aiMessage= {content: finalMessage, role:"assistant"}
          //appendMessage(aiMessage)
           outputDataArray.push({
            instruction: instruction,
            input: input,
            output: finalMessage,
            "Prefill speed": usage?.extra?.prefill_tokens_per_s?.toFixed(2) || "N/A",
            "Decoding speed": usage?.extra?.decode_tokens_per_s?.toFixed(2) || "N/A",
            "Total inference time": times.totalTime.toFixed(2) + " ms",
            "Time to first token": times.timeToFirstToken.toFixed(2) + " ms",
          });
          resolve({ totalTime: times.totalTime, timeToFirstToken: times.timeToFirstToken, usage, tokenIntervals: times.tokenIntervals });
        },
        (error) => {
          console.error("Error generating response:", error);
          resolve({ totalTime: null, timeToFirstToken: null, usage: null, tokenIntervals: [] }); // Treat errors as null
        }
      );
    });

    if (totalTime !== null && usage !== null) {
      inferenceTimes.push(totalTime);
      timeToFirstTokenTimes.push(timeToFirstToken);
      totalInferenceTime += totalTime;

      totalTokens += usage.completion_tokens || 0; 

      const normalizedLatency = totalTime / (usage.completion_tokens || 1);
      normalizedLatencies.push(normalizedLatency);

      if (usage.extra) {
        totalPrefillSpeed += usage.extra.prefill_tokens_per_s || 0;
        totalDecodingSpeed += usage.extra.decode_tokens_per_s || 0;
      }
      if (tokenIntervals && tokenIntervals.length > 0) {
        const sumIntervals = tokenIntervals.reduce((sum, val) => sum + val, 0);
        totalTimeBetweenTokens += sumIntervals;
        totalIntervals += tokenIntervals.length;
      }

    } else {
      console.warn(
        `Inference time or usage for sample #${i + 1} is null due to an error.`
      );
    }

  }

  // Calculate the average inference time
  const totalTimeSum = inferenceTimes.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTimeSum / inferenceTimes.length;

  // Calculate the average time to first token
  const totalTimeToFirstToken = timeToFirstTokenTimes.reduce((sum, time) => sum + time, 0);
  const averageTimeToFirstToken = totalTimeToFirstToken / timeToFirstTokenTimes.length;

  // Calculate the average normalized latency
  const totalNormalizedLatency = normalizedLatencies.reduce(
    (sum, val) => sum + val,
    0
  );
  const averageNormalizedLatency =
    totalNormalizedLatency / normalizedLatencies.length;

  // Calculate the latency metric: total inference time divided by total tokens
  let latencyMetric = 0;
  if (totalTokens > 0) {
    latencyMetric = totalInferenceTime / totalTokens;
  } else {
    console.warn("Total tokens is zero or undefined. Cannot compute latency metric.");
  }

  // Calculate average prefill speed and decoding speed
  const averagePrefillSpeed = totalPrefillSpeed / inferenceTimes.length;
  const averageDecodingSpeed = totalDecodingSpeed / inferenceTimes.length;

  // Calculate average time between tokens
  const averageTimeBetweenTokens = totalTimeBetweenTokens / totalIntervals;
  document.getElementById("average-inference-time").classList.remove("hidden");
  document.getElementById("average-inference-time").innerHTML = `
    <p>Average Inference Time: ${averageTime.toFixed(2)} ms</p>
    <p>Average Time to First Token: ${averageTimeToFirstToken.toFixed(2)} ms</p>
    <p>Average Normalized Latency: ${averageNormalizedLatency.toFixed(2)} ms/token</p>
    <p>Latency Metric (Total Inference Time / Total Tokens): ${latencyMetric.toFixed(2)} ms/token</p>
    <p>Average Prefill Speed: ${averagePrefillSpeed.toFixed(2)} tokens/sec</p>
    <p>Average Decoding Speed: ${averageDecodingSpeed.toFixed(2)} tokens/sec</p>
    <p>Average Time Between Tokens: ${averageTimeBetweenTokens.toFixed(2)} ms</p>
  `;
   outputDataArray.push({
    //modelName: modelName,
    "Average Inference Time": averageTime.toFixed(2) + " ms",
    "Average Time to First Token": averageTimeToFirstToken.toFixed(2) + " ms",
    "Average Normalized Latency": averageNormalizedLatency.toFixed(2) + " ms/token",
    "Latency Metric (Total Inference Time / Total Tokens)": latencyMetric.toFixed(2) + " ms/token",
    "Average Prefill Speed": averagePrefillSpeed.toFixed(2) + " tokens/sec",
    "Average Decoding Speed": averageDecodingSpeed.toFixed(2) + " tokens/sec",
    "Average Time Between Tokens": averageTimeBetweenTokens.toFixed(2) + " ms",
  });

  document.getElementById("start-processing").disabled = false;
  console.log("Processed Output Data:", outputDataArray);

  document.getElementById("download-output").disabled = false;
}


async function generateResponse(messages, onUpdate, onFinish, onError) {
  try {

    const startTime = performance.now(); // Total inference start time
    let firstTokenTime = null;
    let lastTokenTime = null; 
    let finalMessage = '';
    let usage = null;
    const tokenIntervals = [];

    firstTokenTime = null;
    lastTokenTime = null; 
    finalMessage = '';

    console.log('before await engine');
    const completion = await engine.chat.completions.create({
      messages,
      stream: true,
      stream_options: { include_usage: true },
    });
    console.log('after await engine');

    for await (const chunk of completion) {
      console.log('in await loop');
      if (firstTokenTime === null) {
        console.log('first token received');
        firstTokenTime = performance.now();
        lastTokenTime = firstTokenTime;
        const timeToFirstToken = firstTokenTime - startTime;
        console.log(`Time to First Token: ${timeToFirstToken.toFixed(2)} ms`);
      } else {
        if (lastTokenTime !== null) {
          const currentTokenTime = performance.now();
          const timeBetweenTokens = currentTokenTime - lastTokenTime;
          tokenIntervals.push(timeBetweenTokens); // Store the time interval
          lastTokenTime = currentTokenTime;  // Update the last token time
          //console.log(`Time between tokens: ${timeBetweenTokens.toFixed(2)} ms`);
        }
      }
      const deltaContent = chunk.choices[0]?.delta?.content || "";
      finalMessage += deltaContent;
      onUpdate(finalMessage);
      if (chunk.usage) {
        usage = chunk.usage;
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const timeToFirstToken = firstTokenTime - startTime;

    onFinish(finalMessage, usage, { totalTime, timeToFirstToken, tokenIntervals });
  } catch (err) {
    onError(err);
  }
}

/*************** UI logic ***************/
function onMessageSend() {
  const input = document.getElementById("user-input").value.trim();
  const message = {
    content: input,
    role: "user",
  };
  if (input.length === 0) {
    return;
  }
  document.getElementById("send").disabled = true;
  const messages = [
    {
      content: "You are a helpful AI agent helping users.",
      role: "system",
    },
    message,
  ];

  appendMessage(message);

  document.getElementById("user-input").value = "";
  document
    .getElementById("user-input")
    .setAttribute("placeholder", "Generating...");

  const aiMessage = {
    content: "typing...",
    role: "assistant",
  };
  appendMessage(aiMessage);

  const onFinishGenerating = (finalMessage, usage, times) => {
    updateLastMessage(finalMessage);
    document.getElementById("send").disabled = false;

    let usageText = "";
    if (usage) {
      if (usage.extra) {
        usageText = `Prefill Speed: ${usage.extra.prefill_tokens_per_s.toFixed(2)} tokens/sec, Decoding Speed: ${usage.extra.decode_tokens_per_s.toFixed(2)} tokens/sec`;
      }
    }

    const inferenceTimeText = `Total Inference Time: ${times.totalTime.toFixed(2)} ms`;
    const timeToFirstTokenText = `Time to First Token: ${times.timeToFirstToken.toFixed(2)} ms`;

    document.getElementById("chat-stats").classList.remove("hidden");
    document.getElementById(
      "chat-stats"
    ).textContent = `${usageText}\n${inferenceTimeText}\n${timeToFirstTokenText}`;
  };

  generateResponse(
    messages,
    updateLastMessage,
    onFinishGenerating,
    console.error
  );
}

function appendMessage(message) {
  const chatBox = document.getElementById("chat-box");
  const container = document.createElement("div");
  container.classList.add("message-container");
  const newMessage = document.createElement("div");
  newMessage.classList.add("message");
  newMessage.textContent = message.content;

  if (message.role === "user") {
    container.classList.add("user");
  } else {
    container.classList.add("assistant");
  }

  container.appendChild(newMessage);
  chatBox.appendChild(container);
  chatBox.scrollTop = chatBox.scrollHeight; 
}

function updateLastMessage(content) {
  const messageDoms = document
    .getElementById("chat-box")
    .querySelectorAll(".message");
  const lastMessageDom = messageDoms[messageDoms.length - 1];
  lastMessageDom.textContent = content;
}

/*************** UI binding ***************/
const messages = []; 

availableModels.forEach((modelId) => {
  const option = document.createElement("option");
  option.value = modelId;
  option.textContent = modelId;
  document.getElementById("model-selection").appendChild(option);
});
document.getElementById("model-selection").value = selectedModel;
document.getElementById("download").addEventListener("click", function () {
  initializeWebLLMEngine().then(() => {
    document.getElementById("send").disabled = false;
    document.getElementById("start-processing").disabled = false;
  });
});
document.getElementById("send").addEventListener("click", function () {
  onMessageSend();
});

document
  .getElementById("data-file-input")
  .addEventListener("change", function (event) {
    
    document.getElementById("average-inference-time").innerHTML = "";
    document.getElementById("average-inference-time").classList.add("hidden");
    document.getElementById("download-output").disabled = true;
    document.getElementById("top10-inference-times").classList.add("hidden");
    document.getElementById("average-inference-time").classList.add("hidden");
    const filePath = event.target.value || '';
    const fileName = filePath.split('\\').pop().split('/').pop(); 
    
    // Extract file number from filename (e.g., "alpaca_001.json" -> "001")
    let fileNumber = "001"; // Default value
    const fileMatch = fileName.match(/(\d+)\.json$/);
    if (fileMatch && fileMatch[1]) {
      fileNumber = fileMatch[1];
    }

    this.dataset.fileNumber = fileNumber;
    console.log(`File selected: ${fileName}, extracted number: ${fileNumber}`);

    const file = event.target.files[0];
    if (file) {
      
      document.getElementById("start-processing").disabled = false;
      
      window.selectedDataFile = file;
    } else {
      document.getElementById("start-processing").disabled = true;
    }
  });


document
  .getElementById("start-processing")
  .addEventListener("click", function () {
    if (window.selectedDataFile) {
      processDataFile(window.selectedDataFile);
    }
  });


  document.getElementById("download-output").addEventListener("click", function () {
    if (outputDataArray.length === 0) {
      alert("No data to save.");
      return;
    }
    
    const modelName = document.getElementById("model-selection").value.replace(/[^a-zA-Z0-9_-]/g, "");
    const fileNumber = document.getElementById("data-file-input").dataset.fileNumber || "001";
    const fileName = `${modelName}_${fileNumber}_results.json`;

    const jsonString = JSON.stringify(outputDataArray, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log(`File saved as: ${fileName}`);
  });