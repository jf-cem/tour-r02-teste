# Tour R02 — teste no telemóvel

Abrir o endereço GitHub Pages em Safari ou Chrome. No painel, escolher uma posição e carregar em **Testar posição simulada**. O tour abre o panorama mais próximo dessa posição; fechar o painel para navegar.

Há 15 posições junto dos panoramas, uma entre os dois primeiros e uma a cerca de 5 km. Também podem introduzir coordenadas ou testar o GPS real. Acima de 100 m do panorama mais próximo, abre o ponto inicial. O acesso ao GPS exige autorização; se falhar ou for recusado, abre o início. Nenhuma posição é enviada para um servidor pela lógica do teste.

Esta versão só pede localização real ao tocar num botão. **Usar localização real** obtém uma posição uma vez. **Acompanhar localização em tempo real** usa `watchPosition` e muda os panoramas com as novas posições. **Simular caminhada pela tour** percorre posições fictícias em cerca de 43 segundos, usando a mesma lógica de acompanhamento. **Parar acompanhamento / simulação** termina o modo ativo; escolher uma posição manual também o termina. Manter a página aberta durante o acompanhamento: o navegador não garante funcionamento em segundo plano ou com o ecrã bloqueado.

O acompanhamento ignora posições com precisão pior que 20 m. A primeira posição válida escolhe o panorama imediatamente. Depois, exige duas atualizações consecutivas para mudar de ponto e uma vantagem de pelo menos 2 m face ao ponto atual, para evitar oscilações. Estes valores iniciais precisam de validação no terreno, porque existem panoramas próximos entre si.

O painel **Diagnóstico de localização** mostra o contexto HTTPS, a permissão reportada pelo navegador (quando disponível), a política da página, o navegador e o código e mensagem originais da falha. O código 1 indica uma recusa reportada pelo navegador; não prova que o utilizador recusou a permissão do site. Pode também refletir um bloqueio do sistema, aplicação ou política. Estes dados são apresentados apenas localmente.

O mapa Google incluído na exportação não tem chave API configurada e pode apresentar um erro. O teste de proximidade é independente desse mapa.

O tour original está em `tour.html`; o painel de testes está em `index.html`, `test-ui.js`, `geo.js` e `nodes.json`. Para atualizar imagens, substituir os ficheiros exportados do Pano2VR, guardar o novo HTML como `tour.html` e atualizar as coordenadas em `nodes.json`. Não substituir `index.html` pelo HTML exportado. Preservar os IDs e verificar as coordenadas após cada atualização.

Teste sugerido: junto de três panoramas diferentes, entre os dois primeiros, longe da tour, GPS real estando longe, recusa de GPS, navegação com painel fechado e rotação do telemóvel. A precisão do GPS no terreno exige um teste posterior no local.
