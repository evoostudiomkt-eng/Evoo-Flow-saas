# Especificação de Segurança - Evo Studio Mkt

## Invariantes de Dados
1. **Pilar da Agência**: Todo documento (Tarefa, Conteúdo, Lead) DEVE estar vinculado a uma `agencyId`. Um usuário só acessa documentos da sua agência.
2. **Pilar do Cliente**: Um usuário com `role: 'client'` só pode acessar dados onde o `clientId` do documento seja IGUAL ao `clientId` do seu perfil de usuário.
3. **Privilégios de Admin**: Apenas `admin` pode criar novos clientes e deletar registros financeiros.

## "O Doze Sujos" (Payloads de Ataque que serão bloqueados)
1. **Cross-Agency Scraping**: Tentar ler tarefas de outra agência mudando o ID na URL.
2. **Client Privilege Escalation**: Um cliente tentando mudar seu próprio `role` para 'admin'.
3. **Identity Spoofing**: Cliente A tentando criar uma tarefa para o Cliente B.
4. **Financial Leak**: Cliente tentando acessar a subcoleção `financial` de qualquer cliente.
5. **Orphaned Write**: Criar uma tarefa sem uma agência válida vinculada.
6. **Time Spoofing**: Tentar enviar um `createdAt` falso no passado.
7. **Junk Injection**: Tentar enviar um campo `company` com 1MB de texto aleatório.
8. **Field Poisoning**: Tentar adicionar campos ocultos de sistema (ex: `isVerified: true`) num documento de cliente.
9. **Status Jumping**: Cliente tentando marcar uma tarefa como "arquivada" se não tiver permissão.
10. **ID Poisoning**: Usar um ID de documento com caracteres especiais para tentar quebrar queries.
11. **PII Leak**: Cliente tentando ler o email de contato de outro cliente na coleção raiz.
12. **Blind List Query**: Tentar listar todos os usuários do sistema sem filtro de agência.
