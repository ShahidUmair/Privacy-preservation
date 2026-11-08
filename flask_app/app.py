from flask import Flask, render_template, jsonify
from PIL import ImageGrab
from activity_store import ActivityStore
import time
import os
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np

app = Flask(__name__)
MODEL = load_model('../model/model.h5')
LABELS = ['programming', 'youtube_entertainment', 'youtube_edu']
screenshot_dir = "screenshots/captured_images"
os.makedirs(screenshot_dir, exist_ok=True)
activity_store = ActivityStore(os.path.join(app.instance_path, 'activity.sqlite3'))

def capture_and_predict():
    filename = f"{int(time.time())}.png"
    filepath = os.path.join(screenshot_dir, filename)
    img = ImageGrab.grab()
    img = img.resize((224, 224))
    img.save(filepath)

    img_arr = image.img_to_array(img) / 255.0
    img_arr = np.expand_dims(img_arr, axis=0)

    prediction = MODEL.predict(img_arr)[0]
    label = LABELS[np.argmax(prediction)]
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

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
