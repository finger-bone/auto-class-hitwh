FROM python:3.10-slim

RUN apt-get update -y && apt-get install nodejs -y

WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

CMD python app.py