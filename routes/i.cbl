      *Divis�o de identifica��o do programa
       identification division.
       program-id. "Projeto Pizza".
       author. "Evelyn Yasmin Pereira".
       installation. "PC".
       date-written. 08/07/2020.
       date-compiled. 08/07/2020.



      *Divis�o para configura��o do ambiente
       environment division.
       configuration section.
           special-names. decimal-point is comma.

      *-----Declara��o dos recursos externos
       input-output section.
       file-control.
       i-o-control.

      *Declara��o de vari�veis
       data division.

      *----Variaveis de arquivos
       file section.


      *----Variaveis de trabalho
       working-storage section.

       01  relatorio  occurs  20.

           05 nome                                 pic x(15).
           05 filler                               pic x(03)
              value " - ".

           05 diametro                             pic 9(03).
           05 filler                               pic x(03)
              value " - ".

           05 preco                                pic 9(03)v99.
           05 filler                               pic x(03)
              value " - ".

           05 preco_cm2                            pic 9(03)v99.
           05 filler                               pic x(03)
              value " - ".

           05 delta_preco_cm2                      pic 9(03)v99.

           05 diferenca_rel                        pic 9(03)v99.

       77  ind                                     pic 9(02).
       77  menu                                    pic x(01).
       77  area_pizza                              pic 9(02).
       77  pi                                      pic 9(03)v99
                                                   value 3,14.
       77 raio                                     pic 9(03).
       77 controle                                 pic X(02).
       77 auxilio                                  pic 9(02).

      *----Variaveis para comunica��o entre programas
       linkage section.


      *----Declara��o de tela
       screen section.


      *Declara��o do corpo do programa
       procedure division.


           perform inicializa.
           perform processamento.
           perform finaliza.

      * Inicilizacao de variaveis, abertura de arquivos
      * procedimentos que serao realizados apenas uma vez
       inicializa section.
           move   "S"       to     menu
           move  "trocou"   to     controle
           .
       inicializa-exit.
           exit.
      *---------------------------------------------------------------

       processamento section.
           move 0 to ind
           perform until menu <> "S"
               display erase
               add 1 to ind

               if ind > 20 then
                   display "Voc� atingiu o limite de 20 pizzas"
               else
                   display "Informe o nome da pizza "
                   accept nome(ind)

                   display "Informe o diametro "
                   accept diametro(ind)

                   display "Informe o preco "
                   accept preco(ind)
                   perform calculo-preco-cm2
               end-if
                   perform ordena-tabela
                   perform diferenca

               display "deseja cadastrar mais uma pizza? ('S'/'N')"
               accept menu
           end-perform

           perform varying ind from 1 by 1 until ind > 20
                                              or nome(ind) = space
               display relatorio(ind)
           end-perform
               .
       processamento-exit.
           exit.
              .
      *---------------------------------------------------------------

       calculo-preco-cm2 section.
               compute raio = diametro(ind) / 2
               compute area_pizza = (3,14 * (raio * raio))
               compute preco_cm2 (ind) = preco(ind) / area_pizza

               display preco_cm2(ind)

             .
       calculo-preco-cm2-exit.
           exit.

      *---------------------------------------------------------------

       ordena-tabela section.
          move 'trocou'    to controle
          perform until controle <> 'trocou'

          move 1 to ind
          move 'nTrocou'  to controle

               perform until ind = 20
                   or nome(ind + 1) = space
                   if preco_cm2(ind) > preco_cm2(ind + 1) then
                        move preco_cm2(ind + 1) to auxilio
                        move preco_cm2(ind)   to preco_cm2(ind + 1)
                        move auxilio          to preco_cm2(ind)
                        move 'trocou'         to controle
                   end-if
              add 1 to ind
              end-perform
           end-perform
           .
       orderna-tabela-exit.
           exit.

      *---------------------------------------------------------------

       diferenca section .
           move 1 to ind

           perform until ind = 20
           or nome(ind + 1) = space

           compute delta_preco_cm2(ind) =   preco_cm2(ind + 1) -
                                            preco_cm2(ind)

           compute diferenca_rel(ind + 1) = (delta_preco_cm2(ind) * 100)
                                           / preco_cm2(ind)

           add 1 to ind
          end-perform
            .
       diferenca-exit.
           exit.

      *---------------------------------------------------------------

       finaliza section.
           Stop run.
       finaliza-exit.
           exit.












