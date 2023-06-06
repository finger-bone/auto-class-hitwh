from flask import Flask, request, render_template, redirect, session
from automator import Automator
from threading import Thread
import webbrowser

THREAD_COUNT = 2

app = Flask(__name__)
app.secret_key = 'dev'

@app.route('/', methods=['GET', 'POST'])
def main():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        year = request.form.get('year')
        semester = request.form.get('term')
        session['un'] = username
        session['pwd'] = password
        session['semester'] = f'{int(year)}-{int(year)+1}{semester}'
        session['vpn'] = (request.form.get('vpn') == '1')
        return redirect('/select')
    return render_template('login.html', years=range(2020, 2050))

@app.route('/select', methods=['GET', 'POST'])
def select():
    query = Automator(session['vpn'])
    query.login(session['un'], session['pwd'])
    if request.method == 'POST':
        target = []
        # print(request.form)
        for k, v in request.form.items():
            if k == 'submit':
                continue
            # id kind semester
            target.append([*str(v).split('|'), session['semester']])

        session['target'] = target
        return redirect('/final')

    query.fetch_all(session['semester'])
    # print(auto.data)
    return render_template('auto.html', courses=query.data)

@app.route('/final')
def final():
    vpn = session['vpn']
    un = session['un']
    pwd = session['pwd']
    target = session['target']
    def op():
        auto = Automator(vpn)
        auto.login(un, pwd)
        while True:
            for each in target:
                try:
                    print(f'尝试抢课，id为{each[0]}')
                    print('有效' if auto.submit(each[0], each[1], each[2]) else '无效')
                except Exception:
                    print('无效')
    ths = [Thread(target=op) for _ in range(THREAD_COUNT)]
    for each in ths:
        each.start()

    return render_template('final.html')

if __name__ == '__main__':
    webbrowser.open('http://127.0.0.1:5000')
    app.run()