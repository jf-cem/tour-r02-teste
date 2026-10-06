# Tour R02 — teste no telemóvel

## Começar uma caminhada

Escolher **Noutro local — experimentar aqui** ou **No local da visita** e tocar em **Começar caminhada**. Este botão obtém a localização e inicia o acompanhamento numa única ação. Não é necessário verificar o GPS antes. **Terminar caminhada** interrompe o acompanhamento. Tocar no cabeçalho recolhe o painel, mantendo o nome da imagem atual visível. Simulações, coordenadas e diagnóstico ficam em **Opções de teste**.

## Próximo teste no local verdadeiro

No Safari ou Chrome, escolher **No local da visita**, tocar em **Começar caminhada** e permitir a localização. Neste modo, a primeira posição abre a imagem mais próxima das coordenadas reais; não redefine a posição como P01 nem precisa de alinhar os primeiros passos. É possível começar a meio do percurso.

Percorrer primeiro os pontos exteriores, na ida e no regresso. Depois testar os pontos mais próximos entre si, parar em alguns durante cerca de 15 segundos e verificar se a imagem se mantém estável. Registar os pontos onde a mudança atrasa, salta uma imagem ou oscila. Este teste físico permanece por realizar; a verificação automatizada usa posições de GPS simuladas.

## Testar a caminhar noutro local (versão 4)

O modo **Noutro local — experimentar aqui** é o modo inicial. Ao tocar em **Começar caminhada**, a primeira posição com precisão de 20 m ou melhor é guardada em memória como a origem P01. É uma posição nova obtida no início do acompanhamento.

Com **Alinhar os primeiros passos com a direção da visita** ativo, caminhar cerca de 8 m numa direção define a orientação. Os deslocamentos reais seguintes são convertidos em distância e direção relativas, ancorados na geolocalização de P01 e rodados para a direção P01→P02. A lógica de proximidade recebe essas coordenadas virtuais, não a posição distante do telemóvel. Após o alinhamento, reproduzir as curvas do percurso para acompanhar a tour; caminhar em linha reta não percorre automaticamente todos os pontos de uma tour com curvas. Sem alinhamento, as direções geográficas reais são preservadas.

Parar e voltar a iniciar guarda uma nova origem e regressa a P01. A origem não é gravada num servidor ou entre sessões. O modo **No local da visita** mantém o comportamento de geolocalização destinado à visita no local real. As coordenadas exportadas dos panoramas permanecem iguais.

Os primeiros 8 m podem ser afetados pelo ruído do GPS, sobretudo se a precisão indicada for maior que essa distância. Esta calibração é um mecanismo de teste a validar ao ar livre.

Abrir o endereço GitHub Pages em Safari ou Chrome. No painel, escolher uma posição e carregar em **Testar esta posição**. O tour abre o panorama mais próximo dessa posição; fechar o painel para navegar.

Há 15 posições junto dos panoramas, uma entre os dois primeiros e uma a cerca de 5 km. Também podem introduzir coordenadas ou testar o GPS real. Acima de 100 m do panorama mais próximo, abre o ponto inicial. O acesso ao GPS exige autorização; se falhar ou for recusado, abre o início. Nenhuma posição é enviada para um servidor pela lógica do teste.

Esta versão só pede localização real ao tocar num botão. **Verificar a minha localização** obtém uma posição uma vez. **Começar caminhada** usa `watchPosition` e muda os panoramas com as novas posições. **Ver caminhada simulada** percorre posições fictícias em cerca de 43 segundos, usando a mesma lógica de acompanhamento. **Terminar caminhada** termina o modo ativo; escolher uma posição manual também o termina. Manter a página aberta durante o acompanhamento: o navegador não garante funcionamento em segundo plano ou com o ecrã bloqueado.

O acompanhamento ignora posições com precisão pior que 20 m. A primeira posição válida escolhe o panorama imediatamente. Depois, exige duas atualizações consecutivas para mudar de ponto e uma vantagem de pelo menos 2 m face ao ponto atual, para evitar oscilações. Estes valores iniciais precisam de validação no terreno, porque existem panoramas próximos entre si.

O painel **Diagnóstico de localização** mostra o contexto HTTPS, a permissão reportada pelo navegador (quando disponível), a política da página, o navegador e o código e mensagem originais da falha. O código 1 indica uma recusa reportada pelo navegador; não prova que o utilizador recusou a permissão do site. Pode também refletir um bloqueio do sistema, aplicação ou política. Estes dados são apresentados apenas localmente.

O mapa Google incluído na exportação não tem chave API configurada e pode apresentar um erro. O teste de proximidade é independente desse mapa.

O tour original está em `tour.html`; o painel de testes está em `index.html`, `test-ui.js`, `geo.js` e `nodes.json`. Para atualizar imagens, substituir os ficheiros exportados do Pano2VR, guardar o novo HTML como `tour.html` e atualizar as coordenadas em `nodes.json`. Não substituir `index.html` pelo HTML exportado. Preservar os IDs e verificar as coordenadas após cada atualização.

Teste sugerido: junto de três panoramas diferentes, entre os dois primeiros, longe da tour, GPS real estando longe, recusa de GPS, navegação com painel fechado e rotação do telemóvel. A precisão do GPS no terreno exige um teste posterior no local.
