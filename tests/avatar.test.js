import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validAvatar,MAX_AVATAR_LENGTH} from '../avatar.js';
test('Solo acepta fotos JPEG compactas para mostrar en la cuenta',()=>{assert.equal(validAvatar('data:image/jpeg;base64,/9j/AA=='),true);for(const value of [null,'','https://example.com/foto.jpg','data:image/svg+xml;base64,AAA','data:image/png;base64,AAA','data:image/jpeg;base64,AAA'])assert.equal(validAvatar(value),false)});
test('Rechaza fotos demasiado grandes y contenido fuera del alfabeto base64',()=>{assert.equal(validAvatar('data:image/jpeg;base64,/9j/'+'A'.repeat(MAX_AVATAR_LENGTH)),false);assert.equal(validAvatar('data:image/jpeg;base64,/9j/<script>'),false)});
