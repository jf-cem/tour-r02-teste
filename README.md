# Tour R02 — teste no telemóvel

Abrir o endereço GitHub Pages em Safari ou Chrome. No painel, escolher uma posição e carregar em **Testar posição simulada**. O tour abre o panorama mais próximo dessa posição; fechar o painel para navegar.

Há 15 posições junto dos panoramas, uma entre os dois primeiros e uma a cerca de 5 km. Também podem introduzir coordenadas ou testar o GPS real. Acima de 100 m do panorama mais próximo, abre o ponto inicial. O acesso ao GPS exige autorização; se falhar ou for recusado, abre o início. Nenhuma posição é enviada para um servidor pela lógica do teste.

Esta versão só pede localização real ao tocar no botão. O encaminhamento é feito uma vez por teste; não acompanha movimentos. O mapa Google incluído na exportação não tem chave API configurada e pode apresentar um erro. O teste de proximidade é independente desse mapa.

O tour original está em `tour.html`; o painel de testes está em `index.html`, `test-ui.js`, `geo.js` e `nodes.json`. Para atualizar imagens, substituir os ficheiros exportados do Pano2VR, guardar o novo HTML como `tour.html` e atualizar as coordenadas em `nodes.json`. Não substituir `index.html` pelo HTML exportado. Preservar os IDs e verificar as coordenadas após cada atualização.

Teste sugerido: junto de três panoramas diferentes, entre os dois primeiros, longe da tour, GPS real estando longe, recusa de GPS, navegação com painel fechado e rotação do telemóvel. A precisão do GPS no terreno exige um teste posterior no local.
