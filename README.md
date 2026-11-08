# Screen Activity Tracker

A local Flask dashboard that captures the computer screen at randomized intervals, classifies the screenshot into an activity category, and estimates daily, weekly, and monthly tracked time. OCR can add visible text from the top of a screenshot to the activity label.

## Requirements

- Windows desktop session (screen capture and the native folder picker require a local desktop)
- Python version supported by the installed TensorFlow release
- The model file at `model/model.h5`
- Tesseract OCR installed and available on `PATH` for screenshot text labels; without it, the app still runs and shows the classifier category only

## Setup on Windows

Run these commands from the repository root in PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell prevents environment activation, allow scripts for the current terminal session and activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Install the Tesseract OCR application separately, then open a new terminal and verify it is available:

```powershell
tesseract --version
```

The Python package `pytesseract` is installed from `requirements.txt`; it calls the separate Tesseract application.

## Run

Start the server from the `flask_app` directory so the relative model path resolves correctly:

```powershell
Set-Location flask_app
python app.py
```

Open <http://127.0.0.1:5000> in a browser on the same computer. The terminal must remain open while using the dashboard.

## Use the dashboard

- Select **Start tracking** to begin. The first and subsequent captures are scheduled at random intervals between 60 and 90 seconds.
- Select **Stop tracking** to cancel the next scheduled capture.
- Open **Settings** to choose a screenshot folder with **Browse** or enter a folder path, then select **Save settings**.
- Daily, weekly, and monthly time totals are estimates using 75 seconds per capture on average. The classifier has three broad classes: programming, YouTube education, and YouTube entertainment. OCR may append readable text found near the top of the screenshot; it does not understand every app or infer a full task description.

## Local data and privacy

Screenshots are saved to `flask_app/screenshots/captured_images` by default, or to the folder selected in Settings. The selected folder is stored in `flask_app/instance/activity.sqlite3`, which also stores activity history and is ignored by Git. Existing screenshots and history remain on this computer unless you move or remove them.

Capturing the screen can include private information. Keep tracking stopped when it is not needed, and choose a screenshot folder with appropriate access controls. The app is designed to run locally; do not expose its development server to an untrusted network.

## Troubleshooting

- **Model file not found:** run `python app.py` from `flask_app`, and confirm `model/model.h5` exists at the repository root.
- **Tesseract not found:** install the Tesseract application, make sure its executable is on `PATH`, and restart the terminal and Flask app. Category labels continue to work without OCR.
- **Screen capture or folder picker fails:** run the app in an interactive desktop session. A headless server session may not have access to the screen or native folder dialog.
- **Dependency installation fails:** use a Python version supported by the TensorFlow wheel available for your Windows and Python architecture, then recreate the virtual environment and install `requirements.txt` again.
