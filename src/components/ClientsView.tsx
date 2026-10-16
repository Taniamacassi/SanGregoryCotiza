import React, { useState } from 'react';
import { Client, Quote, CompanyProfile } from '../types';
import { formatCurrency } from '../utils/storage';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
  FileText,
  FileCheck,
} from 'lucide-react';

interface Props {
  clients: Client[];
  quotes: Quote[];
  company: CompanyProfile;
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onCreateQuoteForClient: (client: Client) => void;
}

export const ClientsView: React.FC<Props> = ({
  clients,
  quotes,
  company,
  onSaveClient,
  onDeleteClient,
  onCreateQuoteForClient,
}) => {
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [taxIdLabel, setTaxIdLabel] = useState(company.taxIdLabel || 'RUC');
  const [taxId, setTaxId] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState(company.country || 'Chile');
  const [notes, setNotes] = useState('');

  const openCreateModal = () => {
    setEditingClient(null);
    setName('');
    setTaxIdLabel(company.taxIdLabel || 'RUC');
    setTaxId('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity(company.city || '');
    setCountry(company.country || 'Chile');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (cli: Client) => {
    setEditingClient(cli);
    setName(cli.name);
    setTaxIdLabel(cli.taxIdLabel || company.taxIdLabel || 'RUC');
    setTaxId(cli.taxId || '');
    setContactPerson(cli.contactPerson || '');
    setEmail(cli.email || '');
    setPhone(cli.phone || '');
    setAddress(cli.address || '');
    setCity(cli.city || '');
    setCountry(cli.country || '');
    setNotes(cli.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const record: Client = {
      id: editingClient ? editingClient.id : 'cli-' + Date.now(),
      name: name.trim(),
      taxIdLabel: taxIdLabel.trim() || company.taxIdLabel || 'RUC',
      taxId: taxId.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      country: country.trim(),
      notes: notes.trim(),
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString().split('T')[0],
    };

    onSaveClient(record);
    setIsModalOpen(false);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.taxId?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Directorio de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administre los datos de contacto, identificación fiscal y consulte el historial de cotizaciones por cliente.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Cliente</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Buscar por razón social, ${company.taxIdLabel || 'RUC'}, contacto o email...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            {search ? 'No se encontraron clientes coincidentes' : 'No hay clientes registrados'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Agregue los datos de sus clientes para emitir presupuestos rápidamente con sus datos fiscales pre-cargados.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Primer Cliente</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((cli) => {
            const clientQuotes = quotes.filter((q) => q.clientId === cli.id);
            const totalQuotedClient = clientQuotes.reduce((acc, q) => acc + q.total, 0);

            return (
              <div
                key={cli.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {cli.name}
                      </h3>
                      {cli.taxId && (
                        <p className="font-mono text-[11px] text-slate-500 font-semibold">
                          {cli.taxIdLabel || company.taxIdLabel || 'RUC'}: {cli.taxId}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(cli)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Editar datos"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Está seguro de eliminar a ${cli.name}?`
                            )
                          ) {
                            onDeleteClient(cli.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-100">
                    {cli.contactPerson && (
                      <p className="flex items-center gap-1.5 text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cli.contactPerson}</span>
                      </p>
                    )}
                    {cli.email && (
                      <p className="flex items-center gap-1.5 text-slate-600 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cli.email}</span>
                      </p>
                    )}
                    {cli.phone && (
                      <p className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cli.phone}</span>
                      </p>
                    )}
                    {(cli.address || cli.city) && (
                      <p className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {cli.address}{cli.city ? `, ${cli.city}` : ''}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Historial
                    </span>
                    <span className="font-semibold text-slate-800">
                      {clientQuotes.length} {clientQuotes.length === 1 ? 'cotización' : 'cotizaciones'}
                    </span>
                  </div>

                  <button
                    onClick={() => onCreateQuoteForClient(cli)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Cotizar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Razón Social o Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Inversiones Los Boldos SpA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tipo e Identificación Fiscal
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={taxIdLabel}
                      onChange={(e) => setTaxIdLabel(e.target.value)}
                      className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900 font-bold text-xs"
                    >
                      <option value="RUC">RUC</option>
                      <option value="RUS">RUS</option>
                      <option value="RUT">RUT</option>
                      <option value="RFC">RFC</option>
                      <option value="NIT">NIT</option>
                      <option value="CIF">CIF</option>
                      <option value="CUIT">CUIT</option>
                      <option value="DNI">DNI</option>
                      <option value="ID">ID</option>
                    </select>
                    <input
                      type="text"
                      placeholder={`Número ${taxIdLabel}...`}
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: María José Vergara"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Teléfono / Celular
                  </label>
                  <input
                    type="text"
                    placeholder="+56 9 9876 5432"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="Av. Apoquindo 4500, Oficina 801"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    placeholder="Santiago"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    País
                  </label>
                  <input
                    type="text"
                    placeholder="Chile"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Notas Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Observaciones de facturación, plazos acordados o notas del cliente..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {editingClient ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
