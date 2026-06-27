import shutil
import tempfile
from pathlib import Path
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions, EasyOcrOptions
from docling.datamodel.base_models import InputFormat

# --- schemas --- 

class UploadResponse(BaseModel):
    name: str
    markdown: str
    

# --- setup for functions + functions ---

pipeline_options = PdfPipelineOptions()
pipeline_options.do_ocr = True # enables it to read pdfs/images without text layer
pipeline_options.ocr_options = EasyOcrOptions() # EasyOcr is the best option, the other Ocrs suck

converter = DocumentConverter(   # adding format options for the converter
    format_options={
        InputFormat.IMAGE: PdfFormatOption(pipeline_options=pipeline_options),
        InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
    }
)


def convert_to_markdown(upload: UploadFile):
    suffix = Path(upload.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(upload.file, tmp)
        tmp_path = tmp.name

    try:
        doc = converter.convert(tmp_path).document
        return doc.export_to_markdown()
    finally:
        Path(tmp_path).unlink(missing_ok=True)

# --- fastAPI set-up + Routes --- 

app = FastAPI()

@app.get("/")
def home():
    return {}


@app.post("/upload_file_to_markdown", response_model=UploadResponse)
def upload_file_to_markdown(name: str, file: UploadFile = File(...)):
    return {
        "name": name,
        "markdown": convert_to_markdown(file)
    }