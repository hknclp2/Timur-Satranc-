using UnityEngine;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    void Awake()
    {
        DontDestroyOnLoad(gameObject); // Sahne değişse de bu obje silinmez
    }

    // React'ten çağrılacak metot
    public void StartGameMode(string gameMode)
    {
        Debug.Log("React'ten gelen mod: " + gameMode);

        if (gameMode == "vsBot")
        {
            // İleride yazacağın oyun sahnesine geçer
            // SceneManager.LoadScene("GameScene");
        }
        else if (gameMode == "learn")
        {
            Debug.Log("Öğren Modu Açıldı");
        }
    }
}