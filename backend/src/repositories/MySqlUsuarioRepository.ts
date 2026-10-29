import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { UsuarioRepository } from '../contracts/repositories';
import { Usuario } from '../entities/Usuario';

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

  async create(usuario: Usuario): Promise<Usuario> {
    const props = usuario.toProps();
    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nome, email, senha_hash, cpf) VALUES (?, ?, ?, ?)',
      [props.nome, props.email, props.senhaHash, props.cpf],
    );
    return this.mustFind(result.insertId);
  }

  async update(usuario: Usuario): Promise<Usuario> {
    const id = usuario.id;
    if (id === null) throw new Error('Não é possível atualizar um usuário ainda não salvo');
    const props = usuario.toProps();
    // O e-mail não aparece no UPDATE: ele é imutável também no banco.
    await this.pool.query('UPDATE usuarios SET nome = ?, cpf = ?, senha_hash = ? WHERE id = ?', [
      props.nome,
      props.cpf,
      props.senhaHash,
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
    if (!row) return null;
    return new Usuario(
      { nome: String(row.nome), email: String(row.email), senhaHash: String(row.senha_hash), cpf: String(row.cpf) },
      Number(row.id),
    );
  }
}
