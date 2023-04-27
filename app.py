from flask import Flask, request, render_template, flash, redirect, session
from automator import Automator, Course

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
    return render_template('login.html', years=range(2022, 2050))

@app.route('/select', methods=['GET', 'POST'])
def select():
    auto = Automator(session['vpn'])
    auto.login(session['un'], session['pwd'])
    if request.method == 'POST':
        target = []
        # print(request.form)
        for k, v in request.form.items():
            if k == 'submit':
                continue
            # id kind semester
            target.append([*str(v).split('|'), session['semester']])
        
        while True:
            for each in target:
                print(f'尝试抢课，id为{each[0]}')
                print('有效' if auto.submit(each[0], each[1], each[2]) else '无效')
    
    auto.fetch_all(session['semester'])
    # print(auto.data)
    return render_template('auto.html', courses=auto.data)