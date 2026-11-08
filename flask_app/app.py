from flask import Flask, render_template, jsonify, request
from PIL import ImageGrab
from activity_store import ActivityStore
from pathlib import Path
import time
import os
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
from activity_labeler import describe_activity

app = Flask(__name__)
MODEL = load_model('../model/model.h5')
LABELS = ['programming', 'youtube_edu', 'youtube_entertainment']
DEFAULT_SCREENSHOT_DIR = Path(app.root_path) / 'screenshots' / 'captured_images'
DEFAULT_SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
activity_store = ActivityStore(os.path.join(app.instance_path, 'activity.sqlite3'))

def capture_and_predict():
    screenshot_dir = Path(activity_store.get_setting(
        'screenshot_dir', str(DEFAULT_SCREENSHOT_DIR)
    ))
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{time.strftime('%Y%m%d_%H%M%S')}_{time.time_ns() % 1_000_000_000:09d}.png"
    filepath = screenshot_dir / filename
    img = ImageGrab.grab()
    img.save(filepath)

    model_img = img.resize((224, 224))
    img_arr = image.img_to_array(model_img) / 255.0
    img_arr = np.expand_dims(img_arr, axis=0)

    prediction = MODEL.predict(img_arr)[0]
    category = LABELS[np.argmax(prediction)]
    label = describe_activity(img, category)
    activity_store.record(label)
    return label

@app.route('/capture')
def capture():
    label = capture_and_predict()
    return jsonify({
        'status': 'captured',
        'activity': label,
        'dashboard': activity_store.dashboard()
    })

@app.route('/dashboard')
def dashboard():
    return jsonify(activity_store.dashboard())

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'GET':
        return jsonify({
            'screenshot_dir': activity_store.get_setting(
                'screenshot_dir', str(DEFAULT_SCREENSHOT_DIR)
            )
        })

    data = request.get_json(silent=True) or {}
    folder = data.get('screenshot_dir', '').strip()
    if not folder:
        return jsonify({'error': 'Choose a screenshot folder.'}), 400

    try:
        screenshot_dir = Path(folder).expanduser().resolve()
        screenshot_dir.mkdir(parents=True, exist_ok=True)
        if not screenshot_dir.is_dir() or not os.access(screenshot_dir, os.W_OK):
            raise OSError('The selected folder is not writable.')
    except (OSError, RuntimeError, ValueError) as error:
        return jsonify({'error': f'Cannot use this folder: {error}'}), 400

    activity_store.set_setting('screenshot_dir', str(screenshot_dir))
    return jsonify({'screenshot_dir': str(screenshot_dir)})

@app.route('/select-folder', methods=['POST'])
def select_folder():
    initial_dir = activity_store.get_setting(
        'screenshot_dir', str(DEFAULT_SCREENSHOT_DIR)
    )
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        selected_dir = filedialog.askdirectory(
            title='Choose screenshot folder',
            initialdir=initial_dir,
            mustexist=False
        )
        root.destroy()
    except Exception as error:
        return jsonify({'error': f'Folder picker unavailable: {error}'}), 503

    return jsonify({'screenshot_dir': selected_dir or None})

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
