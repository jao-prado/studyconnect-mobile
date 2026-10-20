import { useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';

import { AuthScreen, authStyles } from '../../components/AuthScreen';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { registerStudent } from '../../services/authService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function CadastroScreen() {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmationRef = useRef(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmacao: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: null }));
  }

  async function handleRegister() {
    if (loading) return;
    const nome = form.nome.trim();
    const email = form.email.trim().toLowerCase();
    const nextErrors = {};
    if (!nome) nextErrors.nome = 'Informe seu nome.';
    else if (nome.length > 45) nextErrors.nome = 'Use no máximo 45 caracteres.';
    if (!email) nextErrors.email = 'Informe seu e-mail.';
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = 'Informe um e-mail válido.';
    else if (email.length > 45) nextErrors.email = 'Use no máximo 45 caracteres.';
    if (!form.senha) nextErrors.senha = 'Informe uma senha.';
    else if (!PASSWORD_PATTERN.test(form.senha)) nextErrors.senha = 'Use 8 caracteres, com maiúscula, minúscula, número e símbolo.';
    if (!form.confirmacao) nextErrors.confirmacao = 'Confirme sua senha.';
    else if (form.confirmacao !== form.senha) nextErrors.confirmacao = 'As senhas não coincidem.';
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await registerStudent(nome, email, form.senha);
      setForm((current) => ({ ...current, senha: '', confirmacao: '' }));
      router.replace({ pathname: '/verificar-email', params: { email } });
    } catch (error) {
      if (error.status === 409) setMessage('Este e-mail já está cadastrado.');
      else setMessage(error.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen eyebrow="NOVA CONTA" title="Comece a estudar" subtitle="Crie uma conta gratuita de aluno.">
      <FormInput label="Nome" autoCapitalize="words" autoComplete="name" maxLength={45} value={form.nome} error={errors.nome} onChangeText={(value) => update('nome', value)} onSubmitEditing={() => emailRef.current?.focus()} returnKeyType="next" />
      <FormInput ref={emailRef} label="E-mail" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={45} value={form.email} error={errors.email} onChangeText={(value) => update('email', value)} onSubmitEditing={() => passwordRef.current?.focus()} returnKeyType="next" />
      <FormInput ref={passwordRef} label="Senha" autoCapitalize="none" autoComplete="new-password" secureTextEntry value={form.senha} error={errors.senha} onChangeText={(value) => update('senha', value)} onSubmitEditing={() => confirmationRef.current?.focus()} returnKeyType="next" />
      <Text style={authStyles.hint}>Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo.</Text>
      <FormInput ref={confirmationRef} label="Confirmar senha" autoCapitalize="none" autoComplete="new-password" secureTextEntry value={form.confirmacao} error={errors.confirmacao} onChangeText={(value) => update('confirmacao', value)} onSubmitEditing={handleRegister} returnKeyType="done" />
      {message ? <Text accessibilityRole="alert" style={[authStyles.message, authStyles.error]}>{message}</Text> : null}
      <PrimaryButton title="Criar conta" loading={loading} onPress={handleRegister} />
      <Pressable disabled={loading} onPress={() => router.back()}><Text style={authStyles.link}>Já tenho uma conta</Text></Pressable>
    </AuthScreen>
  );
}
