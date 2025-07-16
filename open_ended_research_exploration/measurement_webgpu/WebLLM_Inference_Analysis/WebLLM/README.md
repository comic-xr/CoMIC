# WebLLM Automation Setup

### Step 1: Initialize the Project

1. Open the terminal and navigate to the project folder:

    ```bash
    cd path/to/your/project
    ```

2. Initialize a Node.js project (if not already done):

    ```bash
    npm init -y
    ```

    This will create a `package.json` file.

### Step 2: Install Dependencies

Install Puppeteer and other necessary dependencies:

```bash
npm install puppeteer
```

### Step 3: Install Live Server (for Visual Studio Code)

1. Open **Visual Studio Code**.
2. Install the **Live Server** extension:
   - Click on **Extensions** 
   - Search for **Live Server**.
   - Click **Install**.

### Step 4: Run the Automation Script

1. Enable webGPU on Chrome/Safari 
2. The random test sample files should be in respective `dataset` folder. (e.g. `test/alpaca_001.json`)
3. Open the terminal in your project folder and execute the automation script:

    ```bash
    node automation.js
    ```

    This will:
   - Open the browser and load the WebLLM page.
   - Automatically select the model.
   - Upload the JSON files from the `test` folder. (or change the folder with your choice)
   - Process the files.
   - Download the result files and save them locally

### Step 5: Results

1. After the automation script runs, check the downloads folder for the downloaded output.
   - The output files will be named based on the model and file number ( `Llama-32-1B-Instruct-q4f32_001_results.json`).
2. Also the JSON file will store the performance metrics such as:
   - **Inference Time**
   - **Time to First Token**
   - **Prefill Speed**
   - **Decoding Speed**
   -**Latency**

---

## Uploading a Model (If Not Automated)

### Step 1: Open the Web Application

1. Open **index.html** in **VS Code**.
2. Right-click on `index.html` and select **"Open with Live Server"**.
3. The application will open in the browser.

### Step 2: Upload a Model File

1. Download a model file.
2. Upload the JSON file through the UI or manually place it in the `test` folder.
   - Example: `test/alpaca_001.json`
3. Open **Developer Tools** (`F12` or `Ctrl + Shift + I`).
4. Go to the **Console** tab to view the results.
