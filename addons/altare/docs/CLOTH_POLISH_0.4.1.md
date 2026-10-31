# Revisão dos bordados e encontros das toalhas — 0.4.1

Pedido: verificar e polir texturas, desenhos e detalhes. Escopo: coleção arquitetônica, sem alterar gameplay, IDs, states, colisão, altura de apoio ou a família clássica/Guadalupe.

## Defeitos reproduzidos na 0.4.0

- A mistura da imagem original com a imagem espelhada nas extremidades sobrepõe desenhos diferentes. Folhas e hastes duplicadas são visíveis nas junções dos módulos.
- A escala vertical do desenho dependia da curva do festão. A primeira linha verde varia de y=24 a y=27,75 no domínio UV; a borda superior se torna ondulada e a figura central também deforma.
- As faces das facetas tinham deslocamento normal de meia espessura e inclinações individuais, produzindo frestas finas. A inspeção aproximada mostra linhas claras atravessando o tecido.

Reprodução: `npm run capture -- --matrix collection --presets pilaster-ruby-7,pilaster-green-7,ogive-agnus-7,ogive-black-7 --views detail,corner --width 2000 --height 1000 --output out/cloth-review-before-0.4.0`. Os packs nessa captura são da 0.4.0; as novas vistas apenas aproximam a câmera. O manifest registra os hashes do conteúdo capturado.

## Critério de aceitação

Repetição sem superposição de motivos diferentes; faixa superior reta; figuras com escala uniforme; recorte e cordão preservados; facetas e cantos com extremos coincidentes em toda a altura. O bordado deve permanecer íntegro nos centros pares/ímpares e nas oito cores. Manter 53.136 permutações, até 50 cubos/modelo, 31,75 MiB RGBA e os contratos publicados. Comparar antes/depois com câmera e iluminação idênticas. Tipos, testes, compatibilidade e pacote oficial devem passar; aparência, apoio e Content Log no Minecraft continuam como gate do usuário.

## Implementação

A fonte v2 permanece intacta. O compositor usa intervalos autorados espelhados; o intervalo floral termina entre flores completas. Repetição e emblema têm margens inferiores próprias para excluir as linhas divisórias da fonte. O desenho ocupa um domínio retangular e o emblema usa a proporção real dos pixels da fonte, com a mesma escala física em X/Y. O tecido livre e o cordão continuam seguindo o festão; a altura da queda não muda.

Os planos externos das facetas passam exatamente pelos pontos que definem a dobra. A espessura de 0,05 fica para dentro, sem inclinação X individual. Uma mitra de largura `sqrt(2) × 0,1` une os dois planos externos no canto. A verificação transforma os extremos do JSON final para espaço de mundo e compara todas as alturas/direções, sem introduzir novos cubos ou mudar colisões.

Fios claros do tema preto recebem metalicidade/relevo próprios. Uma restrição de luminosidade impede que o tecido preto de tom quente seja confundido com ouro. Não há emissividade; as oito cores florais continuam compartilhando normal/MER.

Nas cores claras, a inserção vertical do IHS deixava visível uma área retangular ao redor do símbolo. A família floral passa a usar uma máscara oval junto ao medalhão, preservando a repetição fora dela. O relevo do tecido parte da cor codificada para evitar diferenças sub-byte entre o centro inteiro e suas duas metades. A regressão exige igualdade de cor, materiais e altura na área central.

O Cordeiro recebe a mesma máscara oval para excluir fragmentos dos arabescos vizinhos; a margem inferior termina antes do divisor horizontal da fonte, preservando a franja dentro do medalhão. As regressões verificam as duas áreas livres, além do IHS claro.

O capturador serve diretamente os módulos ESM e recursos locais por HTTP em loopback, com import map para o Three.js instalado. Isso elimina os travamentos de transformação da página sem mudar câmera, iluminação ou o adaptador de geometria. A prontidão é sinalizada após a inicialização do renderizador; rotas fora dos recursos de captura são recusadas.

O servidor de captura mantém as conexões ociosas por 60 s, com margem de 5 s, acomodando quadros por software. Esse ajuste trata a hipótese de fechamento entre quadros após uma falha transitória de leitura; a causa exata daquela requisição não foi registrada. A nova instrumentação imprime URL e erro de rede se houver recorrência. As opções de timeout seguem a [API HTTP do Node 24](https://nodejs.org/docs/latest-v24.x/api/http.html#serverkeepalivetimeoutbuffer).

## Comparação e validação

As duas regressões iniciais falharam contra a 0.4.0 antes das correções. A terceira verificação cobre proporções, recorte, metalicidade e ausência do divisor na área livre do tecido preto. A suíte contém 33 testes.

[Comparação interativa](../out/cloth-comparison-0.4.1/index.html): 16 pares, quatro temas, centro/canto, cor/PBR, câmera idêntica. O gerador confronta os hashes de cada conjunto com seu `.mcaddon`, além de hashes das imagens. [Galeria atual aproximada](../out/cloth-review-0.4.1/index.html). Esta evidência é offline e não representa aprovação Bedrock.

Atualizar 0.4.0 → 0.4.1 não requer conversão de blocos/itens, pois não acrescenta IDs ou states. Retornar à 0.4.0 reverte somente a apresentação. Para versões anteriores à paleta, continuam válidos os limites de [MIGRATION_0.4.0.md](MIGRATION_0.4.0.md). Artefato, hash e resultados finais em [RELEASE_0.4.1.md](RELEASE_0.4.1.md).
