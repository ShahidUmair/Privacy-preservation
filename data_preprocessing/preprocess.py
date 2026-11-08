import os
import shutil
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import tensorflow as tf

DATA_DIR = '../dataset'
AUGMENTED_DIR = '../augmented_data'
os.makedirs(AUGMENTED_DIR, exist_ok=True)

def augment_images():
    datagen = ImageDataGenerator(rotation_range=10, width_shift_range=0.1,
                                 height_shift_range=0.1, zoom_range=0.1,
                                 horizontal_flip=True, fill_mode='nearest')

    for category in os.listdir(DATA_DIR):
        path = os.path.join(DATA_DIR, category)
        save_path = os.path.join(AUGMENTED_DIR, category)
        os.makedirs(save_path, exist_ok=True)

        for img_name in os.listdir(path):
            img_path = os.path.join(path, img_name)
            img = tf.keras.utils.load_img(img_path, target_size=(224, 224))
            x = tf.keras.utils.img_to_array(img)
            x = x.reshape((1,) + x.shape)
            
            i = 0
            for batch in datagen.flow(x, batch_size=1, save_to_dir=save_path, save_prefix='aug', save_format='jpeg'):
                i += 1
                if i >= 5:  # Generate 5 images per original
                    break

augment_images()
