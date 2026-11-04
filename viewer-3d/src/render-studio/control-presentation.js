// Presentation only: hiding an unavailable choice must never clear its draft value.
export function syncAppearanceControls(get,draft,capabilities){
 const classic=!capabilities.architectural;
 const fixedMaterial=capabilities.joinery?'Material: nogueira':capabilities.ornate?'Material: mármore claro':'';
 const reliefUnavailable=capabilities.architectural&&!capabilities.relief&&!capabilities.joinery&&!capabilities.ornate;
 get('classic').hidden=!classic;
 get('architectural').hidden=!capabilities.material;
 get('fixed-material').hidden=!fixedMaterial;
 get('fixed-material').textContent=fixedMaterial;
 get('surface').disabled=!capabilities.material;
 get('colors').hidden=!capabilities.color;
 get('textile').value=draft.textile;
 get('frontal').value=capabilities.relief?draft.relief:'none';
 get('frontal').disabled=!capabilities.relief;
 get('frontal-field').hidden=!capabilities.relief;
 get('relief-limit').hidden=!reliefUnavailable;
 get('frontal-title').hidden=!(classic||capabilities.relief||reliefUnavailable);
 get('guadalupe-field').hidden=!classic;
}
