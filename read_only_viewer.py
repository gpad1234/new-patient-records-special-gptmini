import sqlite3
from pathlib import Path
from wsgiref.simple_server import make_server
from urllib.parse import parse_qs
import json
import re


BASE = Path(__file__).parent
DB_MAIN = BASE / 'data' / 'patient_records.db'
DB_DIABETES = BASE / 'services' / 'data' / 'diabetes.db'


def get_conn(db_path: Path):
    if not db_path.exists():
        return None
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def patient_row_to_dict(row: sqlite3.Row):
    return {k: row[k] for k in row.keys()}


def json_response(start_response, status, data):
    body = json.dumps(data, default=str).encode('utf-8')
    headers = [('Content-Type', 'application/json; charset=utf-8'), ('Content-Length', str(len(body)))]
    start_response(status, headers)
    return [body]


def serve_patients(start_response, db_path, limit=100):
    conn = get_conn(db_path)
    if conn is None:
        return json_response(start_response, '404 Not Found', {'error': 'DB not found'})
    cur = conn.cursor()
    cur.execute("SELECT * FROM patients ORDER BY id LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    data = [patient_row_to_dict(r) for r in rows]
    return json_response(start_response, '200 OK', data)


def serve_patient_by_id(start_response, db_path, pid):
    conn = get_conn(db_path)
    if conn is None:
        return json_response(start_response, '404 Not Found', {'error': 'DB not found'})
    cur = conn.cursor()
    cur.execute("SELECT * FROM patients WHERE id = ?", (pid,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return json_response(start_response, '404 Not Found', {'error': 'patient not found'})
    return json_response(start_response, '200 OK', patient_row_to_dict(row))


def ui_page():
    return '''<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Patients Viewer</title>
  <style>body{font-family:system-ui,Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style>
</head>
<body>
  <h2>Patients (read-only)</h2>
  <div>
    <label>DB: <select id="db"><option value="main">main</option><option value="diabetes">diabetes</option></select></label>
    <label style="margin-left:12px">Limit: <input id="limit" type="number" value="100" min="1" max="1000" style="width:80px"></label>
    <button id="refresh">Refresh</button>
  </div>
  <div id="msg" style="margin-top:8px;color:#666"></div>
  <div id="table" style="margin-top:12px"></div>
  <script>
  async function load(){
    const db = document.getElementById('db').value;
    const limit = document.getElementById('limit').value;
    const msg = document.getElementById('msg');
    msg.textContent = 'Loading...';
    try{
      const res = await fetch('/patients?db='+encodeURIComponent(db)+'&limit='+encodeURIComponent(limit));
      if(!res.ok) throw new Error(await res.text());
      const data = await res.json();
      msg.textContent = `Found ${data.length} patients`;
      if(data.length===0){ document.getElementById('table').innerHTML='(no rows)'; return }
      const cols = Object.keys(data[0]);
      let html = '<table><thead><tr>' + cols.map(c=>'<th>'+c+'</th>').join('') + '</tr></thead><tbody>';
      for(const r of data){ html += '<tr>' + cols.map(c=>'<td>'+(r[c]===null?'':String(r[c]))+'</td>').join('') + '</tr>' }
      html += '</tbody></table>';
      document.getElementById('table').innerHTML = html;
    }catch(e){ msg.textContent = 'Error: '+e.message; document.getElementById('table').innerHTML=''; }
  }
  document.getElementById('refresh').addEventListener('click', load);
  window.addEventListener('load', load);
  </script>
</body>
</html>'''


def app(environ, start_response):
    path = environ.get('PATH_INFO', '')
    qs = parse_qs(environ.get('QUERY_STRING', ''))
    db_choice = qs.get('db', ['main'])[0]
    db_path = DB_MAIN if db_choice == 'main' else DB_DIABETES

    # Health endpoint for CI and monitoring
    if path == '/api/health' or path == '/health':
        def safe_count(path):
            conn = get_conn(path)
            if conn is None:
                return None
            try:
                cur = conn.cursor()
                cur.execute('SELECT COUNT(*) as c FROM patients')
                r = cur.fetchone()
                return int(r['c']) if r else 0
            except Exception:
                return None
            finally:
                conn.close()

        health = {
            'status': 'ok',
            'db_main_exists': DB_MAIN.exists(),
            'db_diabetes_exists': DB_DIABETES.exists(),
            'patients_in_main': safe_count(DB_MAIN),
            'patients_in_diabetes': safe_count(DB_DIABETES),
        }
        return json_response(start_response, '200 OK', health)

    # UI
    if path == '/ui':
        html = ui_page()
        start_response('200 OK', [('Content-Type', 'text/html; charset=utf-8'), ('Content-Length', str(len(html.encode('utf-8'))))])
        return [html.encode('utf-8')]

    # /patients and /api/patients list
    if path == '/patients' or path == '/api/patients':
        limit = int(qs.get('limit', ['100'])[0])
        if limit > 1000:
            limit = 1000
        return serve_patients(start_response, db_path, limit)

    # /patients/<id> and /api/patients/<id>
    m = re.match(r'^/patients/(\d+)$', path) or re.match(r'^/api/patients/(\d+)$', path)
    if m:
        pid = int(m.group(1))
        return serve_patient_by_id(start_response, db_path, pid)

    return json_response(start_response, '404 Not Found', {'error': 'unknown endpoint'})


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', '5002'))
    host = os.environ.get('HOST', 'localhost')
    with make_server(host, port, app) as httpd:
        print(f'Read-only patient viewer running on http://{host}:{port}')
        httpd.serve_forever()
