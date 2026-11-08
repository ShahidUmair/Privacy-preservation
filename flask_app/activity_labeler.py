try:
    import pytesseract
except ImportError:
    pytesseract = None


ACTIVITY_NAMES = {
    'programming': 'Programming',
    'youtube_edu': 'YouTube Education',
    'youtube_entertainment': 'YouTube Entertainment'
}


def describe_activity(img, category):
    category_name = ACTIVITY_NAMES.get(category, category.replace('_', ' ').title())
    if pytesseract is None:
        return category_name

    title_area = img.crop((0, 0, img.width, max(100, int(img.height * 0.2))))
    try:
        text_data = pytesseract.image_to_data(
            title_area,
            output_type=pytesseract.Output.DICT,
            config='--psm 6'
        )
    except (pytesseract.TesseractNotFoundError, pytesseract.TesseractError):
        return category_name

    lines = {}
    for index, raw_text in enumerate(text_data['text']):
        text = ' '.join(raw_text.split())
        try:
            confidence = float(text_data['conf'][index])
        except (TypeError, ValueError):
            continue
        if not text or confidence < 45:
            continue

        line_id = (
            text_data['block_num'][index],
            text_data['par_num'][index],
            text_data['line_num'][index]
        )
        lines.setdefault(line_id, []).append(text)

    title = next((
        ' '.join(words)[:80]
        for words in lines.values()
        if len(' '.join(words)) >= 4 and any(char.isalpha() for char in ' '.join(words))
    ), None)
    return f'{category_name} - {title}' if title else category_name