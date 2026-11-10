import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { UsuarioRepository } from './UsuarioRepository';
import { PAPEIS, Usuario } from './Usuario';
import type { PagedResult, PageRequest } from '../../shared/types';

function lerPapel(valor: unknown): (typeof PAPEIS)[number] {
  return PAPEIS.find((papel) => papel === valor) ?? 'USUARIO';
}

function toUsuario(row: RowDataPacket): Usuario {
  return new Usuario(
    {
      nome: String(row.nome),
      email: String(row.email),
      senhaHash: String(row.senha_hash),
      cpf: String(row.cpf),
      papel: lerPapel(row.papel),
    },
    Number(row.id),
  );
}

export class MySqlUsuarioRepository implements UsuarioRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: number): Promise<Usuario | null> {
    return this.findOne('id = ?', id);
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.findOne('email = ?', email);
  }

  async findByCpf(cpf: string): Promise<Usuario | null> {
    return this.findOne('cpf = ?', cpf);
  }

  async findPage(request: PageRequest): Promise<PagedResult<Usuario>> {
    const [countRows] = await this.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM usuarios');
    const offset = (request.page - 1) * request.limit;
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM usuarios ORDER BY nome ASC, id ASC LIMIT ? OFFSET ?',
      [request.limit, offset],
    );
    return { items: rows.map(toUsuario), total: Number(countRows[0]?.total ?? 0) };
  }

  async create(usuario: Usuario): Promise<Usuario> {
    const props = usuario.toProps();
    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nome, email, senha_hash, cpf, papel) VALUES (?, ?, ?, ?, ?)',
      [props.nome, props.email, props.senhaHash, props.cpf, props.papel],
    );
    return this.mustFind(result.insertId);
  }

  async update(usuario: Usuario): Promise<Usuario> {
    const id = usuario.id;
    if (id === null) throw new Error('Não é possível atualizar um usuário ainda não salvo');
    const props = usuario.toProps();
    // O e-mail não aparece no UPDATE: ele é imutável também no banco.
    await this.pool.query('UPDATE usuarios SET nome = ?, cpf = ?, senha_hash = ?, papel = ? WHERE id = ?', [
      props.nome,
      props.cpf,
      props.senhaHash,
      props.papel,
      id,
    ]);
    return this.mustFind(id);
  }

  private async mustFind(id: number): Promise<Usuario> {
    const usuario = await this.findById(id);
    if (!usuario) throw new Error(`Usuário ${id} não encontrado após gravar`);
    return usuario;
  }

  private async findOne(condition: string, value: string | number): Promise<Usuario | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT * FROM usuarios WHERE ${condition} LIMIT 1`, [value]);
    const row = rows[0];
    return row ? toUsuario(row) : null;
  }
}
