"""Render extra cap-lift poses with the unchanged, audited keyboard scene."""
import argparse,sys,runpy,json
from pathlib import Path
p=argparse.ArgumentParser()
for name in ['cad','hdri','font','output-dir']:p.add_argument('--'+name,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(a.output_dir);out.mkdir(parents=True,exist_ok=True)
sys.argv=['render-key.py','--','--output-dir',str(out),'--cad',a.cad,'--hdri',a.hdri,'--font',a.font,'--width','1600','--height','1400','--samples','384','--save-only']
state=runpy.run_path(str(Path(__file__).with_name('render-key.py')),run_name='dense_key_source')
for i in range(291,380):
    if i%5==0:continue
    file=out/f'lift-{i}.png'
    if file.exists():continue
    state['pose'](i/1000);state['scene'].render.filepath=str(file);state['bpy'].ops.render.render(write_still=True)
    print('DENSE_LIFT',i,flush=True)
(out/'provenance.json').write_text(json.dumps({'range':[.29,.38],'step':.001,'samples':384,'source':'scripts/render-key.py','geometry':'unchanged; same evaluated poses as the existing geometry audit'},indent=2))
