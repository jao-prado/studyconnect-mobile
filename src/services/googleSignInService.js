const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let loadedModule = null;
let configured = false;

function googleError(message, code) {
  return Object.assign(new Error(message), { code });
}

async function getGoogleModule() {
  if (!webClientId) {
    throw googleError('O login com Google ainda não foi configurado neste aplicativo.', 'GOOGLE_NOT_CONFIGURED');
  }

  try {
    loadedModule ??= await import('react-native-nitro-google-signin');
  } catch {
    throw googleError('O login com Google requer um APK ou development build atualizado.', 'GOOGLE_NATIVE_UNAVAILABLE');
  }

  if (!configured) {
    loadedModule.GoogleOneTapSignIn.configure({
      webClientId,
      autoSelectOnSignIn: false,
    });
    configured = true;
  }

  return loadedModule;
}

export async function requestGoogleIdToken() {
  const google = await getGoogleModule();

  try {
    await google.GoogleOneTapSignIn.checkPlayServices(true);
    const response = await google.GoogleOneTapSignIn.presentExplicitSignIn();

    if (google.isCancelledResponse(response)) return null;
    if (!google.isSuccessResponse(response) || !response.data.idToken) {
      throw googleError('O Google não retornou uma credencial válida.', 'GOOGLE_INVALID_RESPONSE');
    }

    return response.data.idToken;
  } catch (error) {
    if (error?.code === 'GOOGLE_INVALID_RESPONSE') throw error;
    if (google.isErrorWithCode(error)) {
      if (error.code === google.statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === google.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw googleError('Atualize o Google Play Services para continuar.', 'GOOGLE_PLAY_SERVICES');
      }
      if (error.code === google.statusCodes.DEVELOPER_ERROR) {
        throw googleError('A configuração do Google para este APK é inválida. Verifique package name e SHA-1.', 'GOOGLE_DEVELOPER_ERROR');
      }
      if (error.code === google.statusCodes.IN_PROGRESS) {
        throw googleError('Uma autenticação com Google já está em andamento.', 'GOOGLE_IN_PROGRESS');
      }
    }
    throw googleError('Não foi possível concluir a autenticação com Google.', 'GOOGLE_SIGN_IN_FAILED');
  }
}

export async function clearGoogleSession() {
  if (!loadedModule || !configured) return;
  try {
    await loadedModule.GoogleOneTapSignIn.signOut();
  } catch {
    // A sessão StudyConnect ainda deve ser encerrada se o provedor estiver indisponível.
  }
}
